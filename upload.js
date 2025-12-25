#!/usr/bin/env node

import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "wallpapers";
const TABLE = "wallpapers";

function fail(message, extra) {
	console.error(`\nError: ${message}`);
	if (extra) console.error(extra);
	process.exit(1);
}

function getContentType(filename) {
	const ext = path.extname(filename).toLowerCase();
	switch (ext) {
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		case ".png":
			return "image/png";
		case ".webp":
			return "image/webp";
		case ".avif":
			return "image/avif";
		case ".gif":
			return "image/gif";
		default:
			return "application/octet-stream";
	}
}

async function generateBlurDataUrl(imageBuffer) {
	// Minimal blurred placeholder: tiny JPEG regardless of input.
	// If anything goes wrong, we return null (allowed by requirements).
	try {
		const tiny = await sharp(imageBuffer)
			.resize({ width: 24, withoutEnlargement: true })
			.blur(8)
			.jpeg({ quality: 40, mozjpeg: true })
			.toBuffer();

		return `data:image/jpeg;base64,${tiny.toString("base64")}`;
	} catch {
		return null;
	}
}

function parseArgs(argv) {
	// Supports:
	//   node upload.js ./path/to/image.jpg
	//   node upload.js ./path/to/folder --log upload-log.txt
	let targetPath;
	let logPath;

	for (let i = 2; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--log") {
			logPath = argv[i + 1];
			if (!logPath) fail("Missing value for --log");
			i++;
			continue;
		}
		if (!targetPath && !arg.startsWith("--")) targetPath = arg;
	}

	return { targetPath, logPath };
}

function isSupportedImageFile(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	return [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"].includes(ext);
}

async function listImageFilesInDir(dirPath) {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	return entries
		.filter((e) => e.isFile())
		.map((e) => path.join(dirPath, e.name))
		.filter(isSupportedImageFile)
		.sort((a, b) => a.localeCompare(b));
}

async function logLine(logPath, line) {
	if (!logPath) return;
	await fs.appendFile(logPath, `${line}\n`, "utf8");
}

async function uploadOne({ supabase, absolutePath, logPath }) {
	const filename = path.basename(absolutePath);
	const bucketPath = path.posix.join("originals", filename);

	let imageBuffer;
	try {
		imageBuffer = await fs.readFile(absolutePath);
	} catch (err) {
		throw new Error(`Failed to read file: ${absolutePath}\n${err?.message ?? err}`);
	}

	let width;
	let height;
	try {
		const meta = await sharp(imageBuffer).metadata();
		width = meta.width;
		height = meta.height;
		if (!width || !height) throw new Error("Could not determine image dimensions.");
	} catch (err) {
		throw new Error(`Failed to extract image metadata via sharp.\n${err?.message ?? err}`);
	}

	const contentType = getContentType(filename);
	const blurDataUrl = await generateBlurDataUrl(imageBuffer);

	const { error: uploadError } = await supabase.storage
		.from(BUCKET)
		.upload(bucketPath, imageBuffer, {
			contentType,
			upsert: false,
			cacheControl: "31536000",
		});

	if (uploadError) {
		throw new Error(
			`Upload failed to bucket '${BUCKET}' at '${bucketPath}'.\n${uploadError.message}`,
		);
	}

	const { data: inserted, error: insertError } = await supabase
		.from(TABLE)
		.insert({
			bucket_path: bucketPath,
			width,
			height,
			blur_data_url: blurDataUrl,
		})
		.select("id")
		.single();

	if (insertError) {
		await supabase.storage.from(BUCKET).remove([bucketPath]);
		throw new Error(
			`Database insert failed; upload was rolled back (best-effort).\n${insertError.message}`,
		);
	}

	const { data: publicUrlData } = supabase.storage
		.from(BUCKET)
		.getPublicUrl(bucketPath);

	const result = {
		filename,
		absolutePath,
		bucketPath,
		publicUrl: publicUrlData.publicUrl,
		width,
		height,
		id: inserted.id,
	};

	await logLine(logPath, `=== ${absolutePath} ===`);
	await logLine(logPath, `Public URL: ${result.publicUrl}`);
	await logLine(logPath, `Dimensions: ${result.width}x${result.height}`);
	await logLine(logPath, `Row ID: ${result.id}`);
	await logLine(logPath, "");

	return result;
}

async function main() {
	const { targetPath, logPath } = parseArgs(process.argv);
	if (!targetPath) {
		console.log("Usage: node upload.js ./path/to/image.jpg");
		console.log("       node upload.js ./path/to/folder --log upload-log.txt");
		process.exit(1);
	}

	const supabaseUrl = process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl) fail("SUPABASE_URL is not set.");
	if (!serviceRoleKey) {
		fail(
			"SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment/.env (backend-only secret).",
		);
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	const resolved = path.resolve(process.cwd(), targetPath);
	let stat;
	try {
		stat = await fs.stat(resolved);
	} catch (err) {
		fail(`Path not found: ${resolved}`, err);
	}

	if (logPath) {
		await logLine(logPath, `Started: ${new Date().toISOString()}`);
		await logLine(logPath, "");
	}

	try {
		if (stat.isDirectory()) {
			const files = await listImageFilesInDir(resolved);
			if (files.length === 0) fail(`No supported images found in: ${resolved}`);

			console.log(`Found ${files.length} images`);
			for (const file of files) {
				const name = path.basename(file);
				console.log(`Uploading ${name}`);
				const result = await uploadOne({ supabase, absolutePath: file, logPath });
				console.log(`OK: ${result.filename}`);
			}
			console.log("All uploads completed.");
			if (logPath) console.log(`Log written to: ${path.resolve(process.cwd(), logPath)}`);
			return;
		}

		const result = await uploadOne({ supabase, absolutePath: resolved, logPath });
		console.log("\nUpload succeeded");
		console.log(`Public URL: ${result.publicUrl}`);
		console.log(`Dimensions: ${result.width}x${result.height}`);
		console.log(`Row ID: ${result.id}`);
		if (logPath) console.log(`Log written to: ${path.resolve(process.cwd(), logPath)}`);
	} catch (err) {
		fail("Upload failed.", err?.message ?? err);
	}
}

await main();

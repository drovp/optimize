import {promises as FSP} from 'fs';
import type {ProcessorUtils} from '@drovp/types';
import {saveAsPath} from '@drovp/save-as-path';
import type {Payload} from './';

const nativeImport = (name: string) => eval(`import('${name}')`);

const encoderExtension = {
	mozjpeg: 'jpg',
	libwebp: 'webp',
	pngquant: 'png',
	optipng: 'png',
	gifsicle: 'gif',
	gif2webp: 'webp',
	svgo: 'svg',
};

export default async (payload: Payload, utils: ProcessorUtils) => {
	const {item, options} = payload;
	const {output} = utils;

	const encoder = options.encoder[item.type];

	if (!encoder) throw new Error(`Unknown encoder "${encoder}".`);

	const outputExtension = encoderExtension[encoder];

	/**
	 * Process the file.
	 */

	const inputBuffer = await FSP.readFile(item.path);
	let outputBuffer;
	let plugin;

	switch (encoder) {
		case 'mozjpeg': {
			const pluginOptions = {...options.mozjpeg} as Partial<Payload['options']['mozjpeg']>;

			if (!pluginOptions.quantTable) delete pluginOptions.quantTable;
			if (!pluginOptions.smooth) delete pluginOptions.smooth;

			plugin = require('imagemin-mozjpeg')(pluginOptions);
			break;
		}

		case 'libwebp': {
			const pluginOptions = {...options.libwebp} as Partial<Payload['options']['libwebp'] & {lossless: boolean}>;

			switch (pluginOptions.mode) {
				case 'quality':
					delete pluginOptions.nearLossless;
					break;
				case 'near_lossless':
					delete pluginOptions.quality;
					delete pluginOptions.alphaQuality;
					delete pluginOptions.method;
				case 'lossless':
					delete pluginOptions.nearLossless;
					pluginOptions.lossless = true;
					break;
			}

			delete pluginOptions.mode;

			const size = pluginOptions.size?.match(/[^\d]+/) ? Number(pluginOptions.size) : undefined;
			delete pluginOptions.size;

			plugin = require('imagemin-webp')({...pluginOptions, size});
			break;
		}

		case 'pngquant':
			plugin = require('imagemin-pngquant')(options.pngquant);
			break;

		case 'optipng':
			plugin = require('imagemin-optipng')(options.optipng);
			break;

		case 'gifsicle':
			plugin = require('imagemin-gifsicle')(options.gifsicle);
			break;

		case 'gif2webp':
			const pluginOptions = {...options.gif2webp} as Partial<
				Payload['options']['gif2webp'] & {lossy: boolean; mixed: boolean}
			>;

			switch (pluginOptions.mode) {
				case 'lossy':
					pluginOptions.lossy = true;
					break;
				case 'mixed':
					pluginOptions.mixed = true;
			}

			delete pluginOptions.mode;

			plugin = require('imagemin-gif2webp')(pluginOptions);
			break;

		case 'svgo': {
			const plugins = [];

			for (const [name, enabled] of Object.entries(options.svgo)) {
				if (enabled) plugins.push(name);
			}

			plugin = (await nativeImport('imagemin-svgo')).default({plugins});
			break;
		}
	}

	const {default: imagemin} = await nativeImport('imagemin');
	outputBuffer = await imagemin.buffer(inputBuffer, {plugins: [plugin]});

	if (!outputBuffer) {
		console.error(`imagemin didn't produce any output.`);
		return;
	}

	if (inputBuffer === outputBuffer) {
		console.error(`imagemin refused to process the file.`);
		return;
	}

	/**
	 * Save the output.
	 */

	const extraTokens: Record<string, string> = {encoder};
	let destination = await saveAsPath(item.path, outputExtension, {
		...options.saving,
		tokenReplacer: (name) => (name in extraTokens ? extraTokens[name] || '' : undefined),
	});
	const tmpPath = `${destination}.tmp`;

	await FSP.writeFile(tmpPath, outputBuffer);
	if (options.saving.deleteOriginal) await FSP.rm(item.path, {force: true});
	await FSP.rename(tmpPath, destination);
	output.file(destination);
};

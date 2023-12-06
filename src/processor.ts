import {promises as FSP} from 'fs';
import type {ProcessorUtils, Flair} from '@drovp/types';
import {checkSaveAsPathOptions, TemplateError, saveAsPath} from '@drovp/save-as-path';
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

export default async ({input, options}: Payload, {output}: ProcessorUtils) => {
	const encoder = options.encoder[input.type];

	if (!encoder) {
		output.error(`Input type "${input.type}" not supported.`);
		return;
	}

	// Check destination template for errors
	try {
		checkSaveAsPathOptions(options.saving);
	} catch (error) {
		if (error instanceof TemplateError) {
			output.error(`Destination template error: ${error.message}`);
			return;
		}
	}

	const outputExtension = encoderExtension[encoder];

	/**
	 * Process the file.
	 */

	const inputBuffer = await FSP.readFile(input.path);
	let outputBuffer;
	let optimizer;

	switch (encoder) {
		case 'mozjpeg': {
			const pluginOptions = {...options.mozjpeg} as Partial<Payload['options']['mozjpeg']>;

			if (!pluginOptions.quantTable) delete pluginOptions.quantTable;
			if (!pluginOptions.smooth) delete pluginOptions.smooth;

			optimizer = (await nativeImport('imagemin-mozjpeg')).default(pluginOptions);
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

			optimizer = (await nativeImport('imagemin-webp')).default({...pluginOptions, size});
			break;
		}

		case 'pngquant':
			optimizer = (await nativeImport('imagemin-pngquant')).default(options.pngquant);
			break;

		case 'optipng':
			optimizer = (await nativeImport('imagemin-optipng')).default(options.optipng);
			break;

		case 'gifsicle':
			optimizer = (await nativeImport('imagemin-gifsicle')).default(options.gifsicle);
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

			optimizer = (await nativeImport('imagemin-gif2webp')).default(pluginOptions);
			break;

		case 'svgo': {
			const plugins = [];

			for (const [name, enabled] of Object.entries(options.svgo)) {
				if (enabled) plugins.push(name);
			}

			optimizer = (await nativeImport('imagemin-svgo')).default({plugins});
			break;
		}
	}

	outputBuffer = await optimizer(inputBuffer);

	if (!outputBuffer) {
		console.error(`imagemin didn't produce any output.`);
		return;
	}

	if (inputBuffer === outputBuffer) {
		console.error(`imagemin refused to process the file.`);
		return;
	}

	const savings = ((inputBuffer.byteLength - outputBuffer.byteLength) / inputBuffer.byteLength) * -1;
	const savingsPercent = numberToPercent(savings);
	let outputPath: string;
	let flair: Flair;

	if (options.minSavings > 0 && savings < options.minSavings / 100) {
		outputPath = input.path;
		flair = {
			variant: 'warning',
			title: `reverted`,
			description: `File reverted as savings didn't reach ${options.minSavings}%.`,
		};
	} else {
		// Save & emit the output
		const tmpPath = `${input.path}.tmp${Math.random().toString().slice(-6)}`;
		await FSP.writeFile(tmpPath, outputBuffer);
		outputPath = await saveAsPath(input.path, tmpPath, outputExtension, {
			...options.saving,
			extraVariables: {encoder},
		});
		flair =
			savings < 0
				? {
						variant: 'success',
						title: savingsPercent,
						description: `Result is ${savingsPercent} smaller than the original.`,
				  }
				: {
						variant: 'danger',
						title: `+${savingsPercent}`,
						description: `Result is ${savingsPercent} larger than the original.`,
				  };
	}

	output.file(outputPath, {flair});
};

/**
 * Format floating point number into percentage string.
 */
function numberToPercent(value: number) {
	return `${(value * 100).toFixed(Math.abs(value) > 0.01 ? 0 : 1)}%`;
}

import {Plugin, PayloadData, OptionsSchema, makeAcceptsFlags} from '@drovp/types';
import {makeOptionSchema as makeSavingOptionSchema, Options as SavingOptions} from '@drovp/save-as-path';

/**
 * Helpers.
 */

const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

function formatSize(bytes: number | string) {
	bytes = Number(bytes) || 0;

	if (typeof bytes !== 'number') return '??';

	let i = 0;
	while (bytes >= 1000) {
		bytes /= 1024;
		i++;
	}
	return `${bytes < 10 ? bytes.toFixed(1) : Math.round(bytes)}${sizeUnits[i]}`;
}

/**
 * Types & schemas.
 */

type Encoder = 'mozjpeg' | 'libwebp' | 'pngquant' | 'optipng' | 'gifsicle' | 'gif2webp' | 'svgo';
type Options = SavingOptions & {
	encoder: {
		jpg: 'mozjpeg' | 'libwebp';
		png: 'pngquant' | 'optipng' | 'mozjpeg' | 'libwebp';
		gif: 'gifsicle' | 'gif2webp';
		webp: 'libwebp' | 'mozjpeg';
		svg: 'svgo';
		[x: string]: Encoder;
	};
	encoderCategory: Encoder;
	mozjpeg: {
		quality: number;
		progressive: boolean;
		fastCrush: boolean;
		dcScanOpt: '0' | '1' | '2';
		trellis: boolean;
		trellisDC: boolean;
		tune: 'psnr' | 'hvs-psnr' | 'ssim' | 'ms-ssim';
		overshoot: boolean;
		arithmetic: boolean;
		dct: 'int' | 'fast' | 'float';
		quantBaseline: boolean;
		quantTable: undefined | 0 | 1 | 2 | 3 | 4 | 5;
		smooth: number;
	};
	libwebp: {
		preset: 'default' | 'photo' | 'picture' | 'drawing' | 'icon' | 'text';
		mode: 'quality' | 'lossless' | 'near_lossless';
		quality: number;
		alphaQuality: number;
		method: number;
		size: string;
		nearLossless: number;
		metadata: 'exif' | 'icc' | 'xmp';
		sns: number;
		filter: number;
		autoFilter: boolean;
		sharpness: number;
	};
	pngquant: {
		speed: number;
		maxQuality: number;
		dithering: number;
		strip: boolean;
	};
	optipng: {
		optimizationLevel: number;
		bitDepthReduction: boolean;
		colorTypeReduction: boolean;
		paletteReduction: boolean;
		interlaced: boolean;
	};
	gifsicle: {
		optimizationLevel: number;
		colors: number;
		interlaced: boolean;
	};
	gif2webp: {
		mode: 'lossless' | 'lossy' | 'mixed';
		quality: number;
		method: number;
		minimize: boolean;
		kmin: number;
		kmax: number;
		filter: number;
		metadata: 'icc' | 'xmp';
		multiThreading: boolean;
	};
	svgo: {
		cleanupAttrs: boolean;
		mergeStyles: boolean;
		inlineStyles: boolean;
		removeDoctype: boolean;
		removeXMLProcInst: boolean;
		removeComments: boolean;
		removeMetadata: boolean;
		removeTitle: boolean;
		removeDesc: boolean;
		removeUselessDefs: boolean;
		removeXMLNS: boolean;
		removeEditorsNSData: boolean;
		removeEmptyAttrs: boolean;
		removeHiddenElems: boolean;
		removeEmptyText: boolean;
		removeEmptyContainers: boolean;
		removeViewBox: boolean;
		cleanupEnableBackground: boolean;
		minifyStyles: boolean;
		convertStyleToAttrs: boolean;
		convertColors: boolean;
		convertPathData: boolean;
		convertTransform: boolean;
		removeUnknownsAndDefaults: boolean;
		removeNonInheritableGroupAttrs: boolean;
		removeUselessStrokeAndFill: boolean;
		removeUnusedNS: boolean;
		prefixIds: boolean;
		cleanupIDs: boolean;
		cleanupNumericValues: boolean;
		cleanupListOfValues: boolean;
		moveElemsAttrsToGroup: boolean;
		moveGroupAttrsToElems: boolean;
		collapseGroups: boolean;
		removeRasterImages: boolean;
		mergePaths: boolean;
		convertShapeToPath: boolean;
		convertEllipseToCircle: boolean;
		sortAttrs: boolean;
		sortDefsChildren: boolean;
		removeDimensions: boolean;
		removeAttrs: boolean;
		removeAttributesBySelector: boolean;
		removeElementsByAttr: boolean;
		addClassesToSVGElement: boolean;
		addAttributesToSVGElement: boolean;
		removeOffCanvasPaths: boolean;
		removeStyleElement: boolean;
		removeScriptElement: boolean;
		reusePaths: boolean;
	};
};

// Options schema for the Options type above
const optionsSchema: OptionsSchema<Options> = [
	makeSavingOptionSchema({
		extraVariables: {
			encoder: `name of the encoder used to compress the file`,
		},
	}),
	{
		name: 'encoder',
		type: 'namespace',
		title: `Optimize with`,
		description: `Choose which optimizer to use for each input type.`,
		schema: [
			{
				name: 'jpg',
				type: 'select',
				options: ['mozjpeg', 'libwebp'],
				default: 'mozjpeg',
				title: 'JPG',
			},
			{
				name: 'png',
				type: 'select',
				options: ['pngquant', 'optipng', 'libwebp'],
				default: 'pngquant',
				title: 'PNG',
			},
			{
				name: 'gif',
				type: 'select',
				options: ['gifsicle', 'gif2webp'],
				default: 'gifsicle',
				title: 'GIF',
			},
			{
				name: 'webp',
				type: 'select',
				options: ['libwebp'],
				default: 'libwebp',
				title: 'WEBP',
			},
			{
				name: 'svg',
				type: 'select',
				options: ['svgo'],
				default: 'svgo',
				title: 'SVG',
			},
		],
	},
	{
		type: 'divider',
		title: `Encoder configuration`,
	},
	{
		name: 'encoderCategory',
		type: 'category',
		options: (options) => ['mozjpeg', 'libwebp', options.encoder.png, options.encoder.gif, 'svgo'],
		default: 'mozjpeg',
	},
	{
		name: 'mozjpeg',
		type: 'namespace',
		isHidden: (_, options) => options.encoderCategory !== 'mozjpeg',
		schema: [
			{
				name: 'quality',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 80,
				title: 'Quality',
				description: `Compression quality, in range 0 (worst) to 100 (perfect).`,
			},
			{
				name: 'progressive',
				type: 'boolean',
				default: true,
				title: 'Progressive',
				description: `Disable to create a baseline JPEG file.`,
			},
			{
				name: 'fastCrush',
				type: 'boolean',
				default: false,
				title: 'Fast crush',
				description: `Disable progressive scan optimization.`,
			},
			{
				name: 'dcScanOpt',
				type: 'select',
				options: ['0', '1', '2'],
				default: '1',
				title: 'DC scan optimization',
				description: (value) =>
					[
						`One scan for all components.`,
						`One scan per component.`,
						`Optimize between one scan for all components and one scan for 1st component plus one scan for remaining components.`,
					][value as 0 | 1 | 2],
			},
			{
				name: 'trellis',
				type: 'boolean',
				default: true,
				title: 'Trellis',
				description: `<a href="https://en.wikipedia.org/wiki/Trellis_quantization">Trellis optimization</a>.`,
			},
			{
				name: 'trellisDC',
				type: 'boolean',
				default: true,
				title: 'Trellis DC',
				description: `Trellis optimization of DC coefficients.`,
			},
			{
				name: 'tune',
				type: 'select',
				options: ['psnr', 'hvs-psnr', 'ssim', 'ms-ssim'],
				default: 'hvs-psnr',
				title: 'Tune',
				description: `Trellis optimization method.`,
			},
			{
				name: 'overshoot',
				type: 'boolean',
				default: true,
				title: 'Overshoot',
				description: `Black-on-white deringing via overshoot.`,
			},
			{
				name: 'arithmetic',
				type: 'boolean',
				default: false,
				title: 'Arithmetic',
				description: `Use <a href="https://en.wikipedia.org/wiki/Arithmetic_coding">arithmetic coding</a>.`,
			},
			{
				name: 'dct',
				type: 'select',
				options: {
					int: 'int: Integer DCT',
					fast: 'fast: Fast integer DCT (less accurate)',
					float: 'float: Floating-point DCT',
				},
				default: 'int',
				title: 'DCT',
				description: `Set <a href="https://en.wikipedia.org/wiki/Discrete_cosine_transform">DCT</a> method.`,
			},
			{
				name: 'quantBaseline',
				type: 'boolean',
				default: false,
				title: 'Quant Baseline',
				description: `Use 8-bit quantization table entries for baseline JPEG compatibility.`,
			},
			{
				name: 'quantTable',
				type: 'select',
				options: {
					0: 'JPEG Annex K',
					1: 'Flat',
					2: 'Custom, tuned for MS-SSIM',
					3: 'ImageMagick table by N. Robidoux',
					4: 'Custom, tuned for PSNR-HVS',
					5: 'Table from paper by Klein, Silverstein and Carney',
				},
				default: undefined,
				nullable: true,
				title: 'Quant table',
				description: `Use predefined quantization table.`,
			},
			{
				name: 'smooth',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 0,
				title: 'Smooth',
				description: `Set the strength of smooth dithered input.`,
				hint: (value) => (!value ? `disabled` : undefined),
			},
		],
	},
	{
		name: 'libwebp',
		type: 'namespace',
		isHidden: (_, options) => options.encoderCategory !== 'libwebp',
		schema: [
			{
				name: 'preset',
				type: 'select',
				options: ['default', 'photo', 'picture', 'drawing', 'icon', 'text'],
				default: 'default',
				title: 'Preset',
				description: `Specify a set of pre-defined parameters to suit a type of source material.`,
			},
			{
				name: 'mode',
				type: 'select',
				options: ['quality', 'lossless', 'near_lossless'],
				default: 'quality',
				title: 'Compression mode',
				description: (value) =>
					({
						quality: `Select desired output quality.`,
						lossless: `Encode the image without any loss.`,
						near_lossless: `Specify the level of near-lossless image preprocessing. `,
					}[value as 'quality' | 'lossless' | 'near_lossless']),
			},
			{
				name: 'quality',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 75,
				title: 'Quality',
				description: `Compression quality, in range 0 (worst) to 100 (perfect).`,
				isHidden: (_, options) => options.libwebp.mode !== 'quality',
			},
			{
				name: 'alphaQuality',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 100,
				title: 'Alpha quality',
				description: `Set transparency-compression quality`,
				isHidden: (_, options) => options.libwebp.mode !== 'quality',
			},
			{
				name: 'method',
				type: 'number',
				min: 0,
				max: 6,
				step: 1,
				default: 4,
				title: 'Method',
				description: `Specify the compression method to use, between 0 (fastest) and 6 (slowest). This parameter controls the trade off between encoding speed and the compressed file size and quality.`,
				isHidden: (_, options) => options.libwebp.mode !== 'quality',
			},
			{
				name: 'size',
				type: 'string',
				default: '',
				title: 'Size',
				description: `Set target size in bytes.`,
				hint: (value) => (value === '' ? 'disabled' : formatSize(value)),
				isHidden: (_, options) => options.libwebp.mode !== 'quality',
				validator: (value) => {
					if (value !== '' && value.match(/[^\d]/)) throw new Error('Has to be a positive integer.');
					return true;
				},
			},
			{
				name: 'nearLossless',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 60,
				title: 'Near lossless',
				description: `Level of near-lossless image preprocessing. This option adjusts pixel values to help compressibility, but has minimal impact on the visual quality. It triggers lossless compression mode automatically. The range is <code>0</code> (maximum pre-processing) to <code>100</code> (same as lossless).`,
				isHidden: (_, options) => options.libwebp.mode !== 'near_lossless',
			},
			{
				name: 'metadata',
				type: 'select',
				options: ['exif', 'icc', 'xmp'],
				default: [],
				title: 'Metadata',
				description: `A list of metadata to copy from the input to the output if present.`,
			},
			{
				name: 'sns',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 80,
				title: 'SNS',
				description: `Set the amplitude of spatial noise shaping between 0 and 100.`,
			},
			{
				name: 'filter',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 0,
				title: 'Filter',
				description: `Set deblocking filter strength between <code>0</code> (off) and <code>100</code>. Typical values are usually in the range of <code>20</code> to <code>50</code>.`,
			},
			{
				name: 'autoFilter',
				type: 'boolean',
				default: false,
				title: 'Auto filter',
				description: `Adjust filter strength automatically.`,
			},
			{
				name: 'sharpness',
				type: 'number',
				min: 0,
				max: 7,
				step: 1,
				default: 0,
				title: 'Sharpness',
				description: `Set filter sharpness between <code>0</code> (sharpest) and <code>7</code> (least sharp).`,
			},
		],
	},
	{
		name: 'pngquant',
		type: 'namespace',
		isHidden: (_, options) => options.encoderCategory !== 'pngquant',
		schema: [
			{
				name: 'speed',
				type: 'number',
				min: 1,
				max: 11,
				step: 1,
				default: 4,
				title: 'Speed',
				description: `<code>1</code> (slowest) to <code>11</code> (fastest).<br>
						Speed <code>10</code> has 5% lower quality, but is about 8 times faster than the default.<br>
						Speed <code>11</code> disables dithering and lowers compression level.`,
			},
			{
				name: 'maxQuality',
				type: 'number',
				min: 0.1,
				max: 1,
				step: 0.1,
				default: 0.8,
				title: 'Max quality',
				description: `Instructs pngquant to use the least amount of colors required to meet or exceed the max quality.<br>
						<code>0</code> (worst) to <code>1</code> (perfect).`,
			},
			{
				name: 'dithering',
				type: 'number',
				min: 0,
				max: 1,
				step: 0.1,
				default: 1,
				title: 'Dithering',
				description: `Set the dithering level using a fractional number between <code>0</code> (none) and <code>1</code> (full).`,
			},
			{
				name: 'strip',
				type: 'boolean',
				default: true,
				title: 'Strip',
				description: `Remove optional metadata.`,
			},
		],
	},
	{
		name: 'optipng',
		type: 'namespace',
		isHidden: (_, options) => options.encoderCategory !== 'optipng',
		schema: [
			{
				name: 'optimizationLevel',
				type: 'number',
				min: 0,
				max: 7,
				step: 1,
				default: 3,
				title: 'Optimization level',
				description: `The optimization level <code>0</code> enables a set of optimization operations that require minimal effort. There will be no changes to image attributes like bit depth or color type, and no recompression of existing IDAT datastreams. The optimization level <code>1</code> enables a single IDAT compression trial. The trial chosen is what. OptiPNG thinks it’s probably the most effective. The optimization levels <code>2</code> and higher enable multiple IDAT compression trials; the higher the level, the more trials.
						<ol>
							<li>1 trial</li>
							<li>8 trials</li>
							<li>16 trials</li>
							<li>24 trials</li>
							<li>48 trials</li>
							<li>120 trials</li>
							<li>240 trials</li>
						</ol>
						`,
			},
			{
				name: 'bitDepthReduction',
				type: 'boolean',
				default: true,
				title: 'Bit depth reduction',
				description: `Apply bit depth reduction.`,
			},
			{
				name: 'colorTypeReduction',
				type: 'boolean',
				default: true,
				title: 'Color type reduction',
				description: `Apply color type reduction.`,
			},
			{
				name: 'paletteReduction',
				type: 'boolean',
				default: true,
				title: 'Palette reduction',
				description: `Apply palette reduction.`,
			},
			{
				name: 'interlaced',
				type: 'boolean',
				default: false,
				title: 'Interlaced',
				description: `Enable Adam7 PNG interlacing on any images that are processed. Interlaced images look better when they're loaded partially, but usually interlace makes compression less efficient.`,
			},
		],
	},
	{
		name: 'gifsicle',
		type: 'namespace',
		isHidden: (_, options) => options.encoderCategory !== 'gifsicle',
		schema: [
			{
				name: 'optimizationLevel',
				type: 'number',
				min: 1,
				max: 3,
				step: 1,
				default: 3,
				title: 'Optimization level',
				description: `The optimization level determines how much optimization is done; higher levels take longer, but may have better results.<br>
						<ol>
							<li>Stores only the changed portion of each image.</li>
							<li>Also uses transparency to shrink the file further.</li>
							<li>Try several optimization methods (usually slower, sometimes better results)</li>
						</ol>
						`,
			},
			{
				name: 'colors',
				type: 'number',
				min: 2,
				max: 256,
				step: 1,
				default: 256,
				title: 'Colors',
				description: `Reduce the number of distinct colors in each output GIF.`,
			},
			{
				name: 'interlaced',
				type: 'boolean',
				default: false,
				title: 'Interlace',
				description: `Interlace gif for progressive rendering.`,
			},
		],
	},
	{
		name: 'gif2webp',
		type: 'namespace',
		isHidden: (_, options) => options.encoderCategory !== 'gif2webp',
		schema: [
			{
				name: 'mode',
				type: 'select',
				options: ['lossless', 'lossy', 'mixed'],
				default: 'mixed',
				title: 'Mode',
				description: (value) =>
					({
						lossless: `Lossless encoding.`,
						lossy: `Encode the image using lossy compression.`,
						mixed: `Mixed compression mode: optimize compression of the image by picking either lossy or lossless compression for each frame heuristically.<br>
								<em>From my tests, there is no difference between lossy and mixed.</em>`,
					}[value as 'lossless' | 'lossy' | 'mixed']),
			},
			{
				name: 'quality',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 75,
				title: 'Quality',
				description: `Specify the compression factor for RGB channels between <code>0</code> and <code>100</code>. In case of lossless compression, a small factor enables faster compression speed, but produces a larger file. Maximum compression is achieved by using a value of <code>100</code>. In case of lossy compression (specified by the Lossy option), a small factor produces a smaller file with lower quality. Best quality is achieved by using a value of <code>100</code>.`,
			},
			{
				name: 'method',
				type: 'number',
				min: 0,
				max: 6,
				step: 1,
				default: 4,
				title: 'Method',
				description: `Specify the compression method to use. This parameter controls the trade off between encoding speed and the compressed file size and quality. Possible values range from <code>0</code> to <code>6</code>. When higher values are used, the encoder will spend more time inspecting additional encoding possibilities and decide on the quality gain. Lower value can result in faster processing time at the expense of larger file size and lower compression quality.`,
			},
			{
				name: 'minimize',
				type: 'boolean',
				default: false,
				title: 'Minimize',
				description: `Minimize output size. Lossless compression by default; can be combined with quality, method, lossy or mixed options.`,
			},
			{
				name: 'kmin',
				type: 'number',
				min: 0,
				max: 60,
				step: 1,
				softMax: true,
				default: 9,
				title: 'Kmin',
				description: `Minimum distance between consecutive key frames.`,
			},
			{
				name: 'kmax',
				type: 'number',
				min: 0,
				max: 60,
				step: 1,
				softMax: true,
				default: 17,
				title: 'Kmax',
				description: `Maximum distance between consecutive key frames.`,
			},
			{
				name: 'filter',
				type: 'number',
				min: 0,
				max: 100,
				step: 1,
				default: 0,
				title: 'Filter',
				description: `Strength of the deblocking filter. For lossy encoding only. <code>0</code> means off. Typical values are usually in the range of <code>20</code> to <code>50</code>.`,
			},
			{
				name: 'metadata',
				type: 'select',
				options: ['icc', 'xmp'],
				default: [],
				title: 'Metadata',
				description: `A list of metadata to copy from the input to the output if present.`,
			},
			{
				name: 'multiThreading',
				type: 'boolean',
				default: false,
				title: 'Multithreading',
				description: `Use multi-threading if available.`,
			},
		],
	},
	{
		name: 'svgo',
		type: 'namespace',
		isHidden: (_, options) => options.encoderCategory !== 'svgo',
		schema: [
			{
				name: 'cleanupAttrs',
				type: 'boolean',
				default: true,
				description: `cleanup attributes from newlines, trailing, and repeating spaces`,
			},
			{
				name: 'mergeStyles',
				type: 'boolean',
				default: true,
				description: `merge multiple style elements into one`,
			},
			{
				name: 'inlineStyles',
				type: 'boolean',
				default: true,
				description: `move and merge styles from &lt;style&gt; elements to element style attributes`,
			},
			{
				name: 'removeDoctype',
				type: 'boolean',
				default: true,
				description: `remove doctype declaration`,
			},
			{
				name: 'removeXMLProcInst',
				type: 'boolean',
				default: true,
				description: `remove XML processing instructions`,
			},
			{
				name: 'removeComments',
				type: 'boolean',
				default: true,
				description: `remove comments`,
			},
			{
				name: 'removeMetadata',
				type: 'boolean',
				default: true,
				description: `remove &lt;metadata&gt;`,
			},
			{
				name: 'removeTitle',
				type: 'boolean',
				default: true,
				description: `remove &lt;title&gt;`,
			},
			{
				name: 'removeDesc',
				type: 'boolean',
				default: true,
				description: `remove &lt;desc&gt;`,
			},
			{
				name: 'removeUselessDefs',
				type: 'boolean',
				default: true,
				description: `remove elements of &lt;defs&gt; without id`,
			},
			{
				name: 'removeXMLNS',
				type: 'boolean',
				default: false,
				description: `removes the xmlns attribute (for inline SVG)`,
			},
			{
				name: 'removeEditorsNSData',
				type: 'boolean',
				default: true,
				description: `remove editors namespaces, elements, and attributes`,
			},
			{
				name: 'removeEmptyAttrs',
				type: 'boolean',
				default: true,
				description: `remove empty attributes`,
			},
			{
				name: 'removeHiddenElems',
				type: 'boolean',
				default: true,
				description: `remove hidden elements`,
			},
			{
				name: 'removeEmptyText',
				type: 'boolean',
				default: true,
				description: `remove empty Text elements`,
			},
			{
				name: 'removeEmptyContainers',
				type: 'boolean',
				default: true,
				description: `remove empty Container elements`,
			},
			{
				name: 'removeViewBox',
				type: 'boolean',
				default: true,
				description: `remove viewBox attribute when possible`,
			},
			{
				name: 'cleanupEnableBackground',
				type: 'boolean',
				default: true,
				description: `remove or cleanup enable-background attribute when possible`,
			},
			{
				name: 'minifyStyles',
				type: 'boolean',
				default: true,
				description: `minify &lt;style&gt; elements content with CSSO`,
			},
			{
				name: 'convertStyleToAttrs',
				type: 'boolean',
				default: true,
				description: `convert styles into attributes`,
			},
			{
				name: 'convertColors',
				type: 'boolean',
				default: true,
				description: `convert colors (from rgb() to #rrggbb, from #rrggbb to #rgb)`,
			},
			{
				name: 'convertPathData',
				type: 'boolean',
				default: true,
				description: `convert Path data to relative or absolute (whichever is shorter), convert one segment to another, trim useless delimiters, smart rounding, and much more`,
			},
			{
				name: 'convertTransform',
				type: 'boolean',
				default: true,
				description: `collapse multiple transforms into one, convert matrices to the short aliases, and much more`,
			},
			{
				name: 'removeUnknownsAndDefaults',
				type: 'boolean',
				default: true,
				description: `remove unknown elements content and attributes, remove attributes with default values`,
			},
			{
				name: 'removeNonInheritableGroupAttrs',
				type: 'boolean',
				default: true,
				description: `remove non-inheritable group&apos;s &quot;presentation&quot; attributes`,
			},
			{
				name: 'removeUselessStrokeAndFill',
				type: 'boolean',
				default: true,
				description: `remove useless stroke and fill attributes`,
			},
			{
				name: 'removeUnusedNS',
				type: 'boolean',
				default: true,
				description: `remove unused namespaces declaration`,
			},
			{
				name: 'prefixIds',
				type: 'boolean',
				default: false,
				description: `prefix IDs and classes with the SVG filename or an arbitrary string`,
			},
			{
				name: 'cleanupIDs',
				type: 'boolean',
				default: true,
				description: `remove unused and minify used IDs`,
			},
			{
				name: 'cleanupNumericValues',
				type: 'boolean',
				default: true,
				description: `round numeric values to the fixed precision, remove default px units`,
			},
			{
				name: 'cleanupListOfValues',
				type: 'boolean',
				default: false,
				description: `round numeric values in attributes that take a list of numbers (like viewBox or enable-background)`,
			},
			{
				name: 'moveElemsAttrsToGroup',
				type: 'boolean',
				default: true,
				description: `move elements&apos; attributes to their enclosing group`,
			},
			{
				name: 'moveGroupAttrsToElems',
				type: 'boolean',
				default: true,
				description: `move some group attributes to the contained elements`,
			},
			{
				name: 'collapseGroups',
				type: 'boolean',
				default: true,
				description: `collapse useless groups`,
			},
			{
				name: 'removeRasterImages',
				type: 'boolean',
				default: false,
				description: `remove raster images`,
			},
			{
				name: 'mergePaths',
				type: 'boolean',
				default: true,
				description: `merge multiple Paths into one`,
			},
			{
				name: 'convertShapeToPath',
				type: 'boolean',
				default: true,
				description: `convert some basic shapes to &lt;path&gt;`,
			},
			{
				name: 'convertEllipseToCircle',
				type: 'boolean',
				default: true,
				description: `convert non-eccentric &lt;ellipse&gt; to &lt;circle&gt;`,
			},
			{
				name: 'sortAttrs',
				type: 'boolean',
				default: false,
				description: `sort element attributes for epic readability`,
			},
			{
				name: 'sortDefsChildren',
				type: 'boolean',
				default: true,
				description: `sort children of &lt;defs&gt; in order to improve compression`,
			},
			{
				name: 'removeDimensions',
				type: 'boolean',
				default: false,
				description: `remove width/height and add viewBox if it&apos;s missing (opposite to removeViewBox, disable it first)`,
			},
			{
				name: 'removeAttrs',
				type: 'boolean',
				default: false,
				description: `remove attributes by pattern`,
			},
			{
				name: 'removeAttributesBySelector',
				type: 'boolean',
				default: false,
				description: `removes attributes of elements that match a CSS selector`,
			},
			{
				name: 'removeElementsByAttr',
				type: 'boolean',
				default: false,
				description: `remove arbitrary elements by ID or className`,
			},
			{
				name: 'addClassesToSVGElement',
				type: 'boolean',
				default: false,
				description: `add classnames to an outer &lt;svg&gt; element`,
			},
			{
				name: 'addAttributesToSVGElement',
				type: 'boolean',
				default: false,
				description: `adds attributes to an outer &lt;svg&gt; element`,
			},
			{
				name: 'removeOffCanvasPaths',
				type: 'boolean',
				default: false,
				description: `removes elements that are drawn outside of the viewbox`,
			},
			{
				name: 'removeStyleElement',
				type: 'boolean',
				default: false,
				description: `remove &lt;style&gt; elements`,
			},
			{
				name: 'removeScriptElement',
				type: 'boolean',
				default: false,
				description: `remove &lt;script&gt; elements`,
			},
			{
				name: 'reusePaths',
				type: 'boolean',
				default: false,
				description: `Find duplicated elements and replace them with links`,
			},
		],
	},
];

const acceptsFlags = makeAcceptsFlags<Options>()({
	files: ['jpg', 'png', 'webp', 'svg', 'gif'],
});

export type Payload = PayloadData<Options, typeof acceptsFlags>;

export default (plugin: Plugin) => {
	plugin.registerProcessor<Payload>('optimize', {
		main: 'dist/processor.js',
		description: 'Perceptually lossless image & SVG size optimization.',
		accepts: acceptsFlags,
		threadType: 'cpu',
		parallelize: true,
		options: optionsSchema,
	});
};

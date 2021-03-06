'use strict';

var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs-extra');
var path = require('path');

var fullDeploy = (argv.full || argv.f);

module.exports = {
	getLanguageProperties: function(pathBuild) {
		var pathContent = path.join(pathBuild, 'WEB-INF/src/content');

		var languageKeys = [];

		if (fs.existsSync(pathContent) && fs.statSync(pathContent).isDirectory()) {
			var contentFiles = fs.readdirSync(pathContent);

			_.forEach(
				contentFiles,
				function(item, index) {
					if (item.match(/Language.*properties/)) {
						var xmlElement = '<language-properties>content/' + item + '</language-properties>';

						languageKeys.push(xmlElement);
					}
				}
			);
		}

		return languageKeys;
	},

	getSrcPath: function(srcPath, config, validator) {
		var originalSrcPath = srcPath;

		if (_.isUndefined(config)) {
			config = {};
		}

		var changedFile = config.changedFile;

		var changed = (changedFile && (changedFile.type == 'changed'));

		var fastDeploy = (!fullDeploy && config.deployed);

		if (changed && fastDeploy) {
			var changedFileName = path.basename(changedFile.path);

			if (validator && !validator(changedFileName)) {
				return srcPath;
			}

			srcPath = changedFile.path;

			if (config.returnAllCSS && this.isCssFile(changedFile.path)) {
				srcPath = originalSrcPath + '.+(css|scss)';
			}

			if (config.version && config.version == '6.2' && this.isCssFile(changedFileName)) {
				if (this.isSassPartial(changedFile.path)) {
					return originalSrcPath;
				}

				var cssExtChanged = _.isUndefined(config.cssExtChanged) ? true : config.cssExtChanged;

				if (cssExtChanged) {
					changedFileName = changedFileName.replace(/\.css/, '.scss');
				}

				srcPath = path.join(originalSrcPath, '..', changedFileName);
			}
		}

		return srcPath;
	},

	isCssFile: function(name) {
		return _.endsWith(name, '.css') || _.endsWith(name, '.scss');
	},

	isSassPartial: function(name) {
		return _.startsWith(path.basename(name), '_');
	}
};
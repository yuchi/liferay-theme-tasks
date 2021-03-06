var _ = require('lodash');
var events = require('events');
var fs = require('fs');
var lfrThemeConfig = require('../lib/liferay_theme_config');
var path = require('path');
var spawn = require('child_process').spawn;
var versionMap = require('../lib/version_map');

var DEFAULT_THEME_CONFIG = {
	baseTheme: 'styled',
	supportCompass: false,
	version: '7.0'
};

var SASS_DEPENDENCIES = {
	libSass: {
		'compass-mixins': '0.12.x',
		'gulp-sass': '2.0.x'
	},

	rubySass: {
		'gulp-ruby-sass': '2.0.x'
	}
};

var STR_STYLED = 'styled';

var STR_UNSTYLED = 'unstyled';

var VERSION_MAP = {
	'6.2': '6.2',
	'7.0': '1.0'
};

var eventEmitter = new events.EventEmitter();

var themeConfig = DEFAULT_THEME_CONFIG;

if (hasParentTheme()) {
	themeConfig = lfrThemeConfig.getConfig(false, path.join(__dirname, '../../../')) || DEFAULT_THEME_CONFIG;
}

var parentLiferayThemeVersion = themeConfig.version;

var themeDependencies = getThemeDependencies(parentLiferayThemeVersion, themeConfig.supportCompass);

try {
	var npm = require('npm');

	npm.load({
		loaded: false
	}, function(err) {
		if (err) throw err;

		npm.commands.install(themeDependencies, function(err, data) {
			if (err) throw err;

			insertInjectTags();

			eventEmitter.emit('dependenciesInstalled');
		});
	});
}
catch(e) {
	spawnNPMInstall();
}

function getSassDependencies(supportCompass) {
	var dependencyMap = supportCompass ? SASS_DEPENDENCIES.rubySass : SASS_DEPENDENCIES.libSass;

	return _.map(dependencyMap, function(item, index) {
		return index + '@' + item;
	});
}

function getThemeDependencies(version, supportCompass) {
	var versionString = '@' + VERSION_MAP[version] + '.x';

	var mixins = versionMap.getDependencyName('mixins', version) + versionString;
	var styled = versionMap.getDependencyName('styled', version) + versionString;
	var unstyled = versionMap.getDependencyName('unstyled', version) + versionString;

	var dependencies = getSassDependencies(supportCompass).concat([mixins, styled, unstyled]);

	if (themeConfig.baseTheme == 'classic' && version != '6.2') {
		var classic = versionMap.getDependencyName('classic', version) + versionString;

		dependencies.push(classic);
	}

	return dependencies;
}

function hasParentTheme() {
	return fs.existsSync(path.join(__dirname, '../../../package.json'));
}

function insertInjectTag(dependency, filePath, regex, replacer) {
	filePath = path.join(__dirname, '../node_modules', versionMap.getDependencyName(dependency, parentLiferayThemeVersion), filePath);

	var fileContents = fs.readFileSync(filePath, {
		encoding: 'utf8'
	});

	regex = new RegExp(regex, 'g');

	fileContents = fileContents.replace(regex, replacer);

	fs.writeFileSync(filePath, fileContents, {
		encoding: 'utf8'
	});
}

function insertInjectTags() {
	var templateRegex = '(<\\/body>)';

	var templateReplacer = function(match) {
		return '<!-- inject:js -->\n<!-- endinject -->\n\n' + match;
	};

	insertInjectTag(STR_UNSTYLED, 'templates/portal_normal.vm', templateRegex, templateReplacer);
	insertInjectTag(STR_UNSTYLED, 'templates/portal_normal.ftl', templateRegex, templateReplacer);
}

function spawnNPMInstall() {
	var child = spawn('npm', ['install'].concat(themeDependencies));

	child.stdout.on('data', function(data) {
		process.stdout.write(data.toString());
	});

	child.stderr.on('data', function(data) {
		process.stdout.write(data.toString());
	});

	child.on('close', function(code) {
		if (code != 0) {
			process.stdout.write('npm install child process exited with code ' + code);
		}

		insertInjectTags();

		eventEmitter.emit('dependenciesInstalled');
	});

	child.on('error', function(err) {
		console.log(err);
	});
}

module.exports = eventEmitter;
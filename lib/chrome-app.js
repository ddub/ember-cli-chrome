'use strict';

var path = require('path');
var fs   = require('fs');
var replace     = require('broccoli-replace');
var funnel   = require('broccoli-funnel');
var writeFile = require('broccoli-file-creator');
var mergeTrees = require('broccoli-merge-trees');
var stringUtil = require('ember-cli/lib/utilities/string')

function EmberCLIChrome(project) {
  this.project = project;
  this.name    = 'Ember CLI Chrome';
}

function unwatchedTree(dir) {
  return {
    read:    function() { return dir; },
    cleanup: function() { }
  };
}

function injectENVJson(name, fn, env, tree, files) {
  // TODO: real templating
  var self = this;
  var nameString = function() {
    return name;
  }

  return replace(tree, {
    files: files,
    patterns: [
    {
      match: /\{\{APPNAME\}\}/g,
      replacement: nameString
    }]
  });
}

function injectManifest(app, env) {
  var self = this;

  // Set recommended defaults
  // from https://developer.chrome.com/extensions/manifest
  var default_locale = env.APP.default_locale !== undefined ? env.APP.default_locale : 'en';
  var background = env.APP.background !== undefined ? env.APP.background : {
    "persistent": false
  };
  var icons = env.APP.icons !== undefined ? env.APP.icons : {
    "128": "chrome-icon-lg.png",
  };
  // match existing permissions if not overridden
  var permissions = env.APP.permissions !== undefined ? env.APP.permissions : [
    "<all_urls>",
    "tabs",
    "bookmarks"
  ];

  // if nothing is set then use the existing defaults
  var browser_action = env.APP.browser_action;
  if (env.APP.browser_action === undefined &&
      env.APP.page_action === undefined &&
      env.APP.background === undefined &&
      env.APP.overrides === undefined) {
    browser_action = {
      "default_icon": "chrome-icon.png",
      "default_popup": "index.html"
    }
  }

  var manifest = {
    "manifest_version": 2,
    "name": app.name,
    "version": app.project.pkg.version,
    "author": app.project.pkg.author,
    "automation": env.APP.automation,
    "background": env.APP.background,
    "background_page": env.APP.background_page,
    "browser_action": browser_action,
    "chrome_settings_overrides": env.APP.chrome_settings_overrides,
    "chrome_ui_overrides": env.APP.chrome_ui_overrides,
    "chrome_url_overrides": env.APP.chrome_url_overrides,
    "commands": env.APP.commands,
    "content_capabilities": env.APP.content_capabilities,
    "content_pack": env.APP.content_pack,
    "content_scripts": env.APP.content_scripts,
    "content_security_policy": env.APP.content_security_policy,
    "converted_from_user_script": env.APP.converted_from_user_script,
    "copresence": env.APP.copresence,
    "current_locale": env.APP.current_locale,
    "default_locale": default_locale,
    "description": app.project.pkg.description,
    "devtools_page": env.APP.devtools_page,
    "externally_connectable": env.APP.externally_connectable,
    "file_browser_handlers": env.APP.file_browser_handlers,
    "file_system_provider_capabilities": env.APP.file_system_provider_capabilities,
    "homepage_url": app.project.pkg.homepage,
    "icons": icons,
    "import": env.APP.modules,
    "incognito": env.APP.incognito,
    "input_components": env.APP.input_components,
    "key": env.APP.key,
    "minimum_chrome_version": env.APP.minimum_chrome_version,
    "nacl_modules": env.APP.nacl_modules,
    "oauth2": env.APP.oauth2,
    "offline_enabled": env.APP.offline_enabled,
    "omnibox": env.APP.omnibox,
    "optional_permissions": env.APP.optional_permissions,
    "options_page": env.APP.options_page,
    "options_ui": env.APP.options_ui,
    "page_action": env.APP.page_action,
    "permissions": permissions,
    "platforms": env.APP.platforms,
    "plugins": env.APP.plugins,
    "requirements": env.APP.requirements,
    "sandbox": env.APP.sandbox,
    "short_name": env.APP.short_name,
    "signature": env.APP.signature,
    "spellcheck": env.APP.spellcheck,
    "storage": env.APP.storage,
    "system_indicator": env.APP.system_indicator,
    "tts_engine": env.APP.tts_engine,
    "update_url": env.APP.update_url,
    "version_name": env.APP.version_name,
    "web_accessible_resources": env.APP.web_accessible_resources
  }

  return writeFile('/manifest.json', JSON.stringify(manifest));
}

EmberCLIChrome.prototype.treeFor = function treeFor(name) {

}

EmberCLIChrome.prototype.included = function included(app) {
  var root_path = app.project.root;
  var getJSON = require(root_path + "/config/environment.js")

  var treePath =  path.join('node_modules', 'ember-cli-chrome', 'chrome-files');
  if (fs.existsSync(treePath)) {
    var files = ['ember-chrome.js'];
    var env = funnel(unwatchedTree(treePath),{
      srcDir: '/',
      files: files,
      destDir: '/'
    });
    var envTree = injectENVJson(app.name, getJSON, app.env, env, files);
  }


  var manifestTree = injectManifest(app, getJSON(app.env));


  var files = ['chrome-icon.png', 'chrome-icon-lg.png'];
  var iconTree = funnel(unwatchedTree(treePath),{
    srcDir: '/',
    files: files,
    destDir: '/'
  });


  app.oldIndex = app.index;
  app.index = function() {
    var indexTree = app.oldIndex();
    return mergeTrees([indexTree, envTree, iconTree, manifestTree]);
  };

  app.options.fingerprint.enabled = false; // Disabled fingerprinting, pointless in a chrome extension.


}

module.exports = EmberCLIChrome;

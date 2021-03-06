var window, document;
Cu.import("resource://services-common/stringbundle.js");

function getTBI(id) {
	return document.getElementById(id) || window.gNavToolbox.palette.querySelector("#" + id);
}

exports = {
	load: function (win) {
		window = win;
		document = window.document;
		this.initAddonbar();
		this.makeCustomizable();
		this.initToggle();
		this.ensureSpecialWide();

		document.getElementById("addon-bar")._delegatingToolbar = "GiT-addon-bar";

		let appendStatusbar = window.CustomizableUI
				.getWidgetIdsInArea("GiT-addon-bar").slice(-1)[0] === "GiT-status-bar-container";
		if (window.Application.prefs.getValue("extensions.GiTAddonBar.remigrate", false)) {
			this.reMigrateItems("GiT-addon-bar");
			if (appendStatusbar) {
				window.CustomizableUI.addWidgetToArea("GiT-status-bar-container", "GiT-addon-bar");
			}
			window.Application.prefs.setValue("extensions.GiTAddonBar.remigrate", false);
		}
	},
	initAddonbar: function () {
		/* css */
		let css = document.createProcessingInstruction("xml-stylesheet",
			"href='chrome://GiT-addonbar/skin/addonbar.css' class='GiT-addonbar-style' type='text/css'"
		);

		document.insertBefore(css, document.firstChild);

		window.GiTAddonBarStylesheet = css;

		let sb = new StringBundle("chrome://GiT-addonbar/locale/addonbar.properties");

		let toolbarName = sb.get("addonbar");
		let accessKey = sb.get("accessKey");
		let collapsed = window.Application.prefs.getValue("extensions.GiTAddonBar.collapsed", false);
		let compact = window.Application.prefs.getValue("extensions.GiTAddonBar.compactMode", false);

		let addonbar = document.createElement("toolbar");
		addonbar.id = "GiT-addon-bar";
		addonbar.setAttribute("class", "toolbar-primary chromeclass-toolbar");
		addonbar.setAttribute("toolbarname", toolbarName);
		addonbar.setAttribute("hidden", "false");
		addonbar.setAttribute("context", "toolbar-context-menu");
		addonbar.setAttribute("toolboxid", "navigator-toolbox");
		addonbar.setAttribute("mode", "icons");
		addonbar.setAttribute("accesskey", accessKey);
		addonbar.setAttribute("iconsize", "small");
		addonbar.setAttribute("key", "GiT-addon-bar-togglekey");
		addonbar.setAttribute("customizable", "true");
		addonbar.setAttribute("collapsed", collapsed);
		addonbar.setAttribute("compact", compact);
		document.getElementById("browser-bottombox").appendChild(addonbar);

		window.addEventListener("unload", this.onUnload, false);
	},
	initToggle: function () {
		let keyset = document.createElement("keyset");
		let key = document.createElement("key");
		let keyPlace = document.getElementById("mainKeyset").parentElement;

		keyset.id = "GiT-addon-bar-keyset";
		key.id = "GiT-addon-bar-togglekey";
		keyset.appendChild(key);
		key.setAttribute("key", "/");
		key.setAttribute("modifiers", "accel");
		key.setAttribute("oncommand", "void(0)");
		key.addEventListener("command", this.toggleVisibility, false);
		keyPlace.appendChild(keyset);
	},
	makeCustomizable: function () {
		let toolbox = document.getElementById("navigator-toolbox");
		toolbox.addEventListener("beforecustomization", this.beforeCustomizing, false);
		toolbox.addEventListener("aftercustomization", this.afterCustomization, false);

		let customizingView = document.getElementById("customization-container");
		let extraHbox = document.createElement("hbox");
		extraHbox.id = "GiT-addon-bar-extraHbox";
		extraHbox.setAttribute("flex", "1");

		Array.slice(customizingView.childNodes).forEach(function (node) {
			extraHbox.appendChild(node);
		});
		customizingView.appendChild(extraHbox);
	},
	beforeCustomizing: function (e) {
		let customizingView = document.getElementById("customization-container");
		let addonbar = document.getElementById("GiT-addon-bar");
		customizingView.appendChild(addonbar);
	},
	afterCustomization: function (e) {
		let addonbar = document.getElementById("GiT-addon-bar");
		document.getElementById("browser-bottombox").appendChild(addonbar);
	},
	ensureSpecialWide: function () {
		let contents = document.getElementById("PanelUI-contents");
		let items = Array.splice(contents.children);
		items.forEach(function (item) {
			if (item.id.search(/special-(spring|separator)/) !== -1) {
				item.classList.add("panel-wide-item");
			}
		});
	},
	reMigrateItems: function (area) {
		let shim = document.getElementById("addon-bar");
		let items = shim.getMigratedItems();

		items.forEach(function (item) {
			let placement = window.CustomizableUI.getPlacementOfWidget(item);
			let exists = getTBI(item);
			if (exists && (!placement || placement.area !== area)) {
				try {
					window.CustomizableUI.addWidgetToArea(item, area);
				} catch (e) {
					window.console.log(e);
				}
			}
		});
	},
	onUnload: function (e) {
		let addonbar = document.getElementById("GiT-addon-bar");
		window.Application.prefs.setValue("extensions.GiTAddonBar.collapsed", addonbar.collapsed);
	},
	toggleVisibility: function (e) {
		var addonbar = e.target.ownerDocument.getElementById("GiT-addon-bar");
		if (addonbar.collapsed === false) {
			addonbar.collapsed = true;
		} else {
			addonbar.collapsed = false;
		}
	},
	unload: function (win) {
		window = win;
		document = window.document;

		if (window.Application.prefs.getValue("extensions.GiTAddonBar.undoRemigrate", false)) {
			this.reMigrateItems("nav-bar");
			window.Application.prefs.setValue("extensions.GiTAddonBar.undoRemigrate", false);
		}

		let keyset = document.getElementById("GiT-addon-bar-keyset");
		let key = document.getElementById("GiT-addon-bar-togglekey");
		let addonbar = document.getElementById("GiT-addon-bar");
		let shim = document.getElementById("addon-bar");

		shim.setAttribute("toolbar-delegate", "nav-bar");
		shim._delegatingToolbar = "nav-bar";
		key.removeEventListener("command", this.toggleVisibility);
		keyset.parentElement.removeChild(keyset);
		window.gNavToolbox.externalToolbars
			.splice(window.gNavToolbox.externalToolbars.indexOf(addonbar), 1);
		addonbar.parentElement.removeChild(addonbar);
		window.removeEventListener("unload", this.onUnload, false);

		let toolbox = document.getElementById("navigator-toolbox");
		toolbox.removeEventListener("beforecustomization", this.beforeCustomizing);
		toolbox.removeEventListener("aftercustomization", this.afterCustomization);

		let customizingView = document.getElementById("customization-container");
		let extraHbox = document.getElementById("GiT-addon-bar-extraHbox");

		Array.slice(extraHbox.childNodes).forEach(function (node) {
			customizingView.appendChild(node);
		});
		customizingView.removeChild(extraHbox);

		window.GiTAddonBarStylesheet.parentNode
			.removeChild(window.GiTAddonBarStylesheet);

		delete window.GiTAddonBarStylesheet;
	}
};

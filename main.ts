import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface Settings {
	apiKey: string;
	trackerPointCount: number;
	privacyMode: boolean;
	privacyText: string;
}

const DEFAULT_SETTINGS: Settings = {
	apiKey: '',
	trackerPointCount: 1,
	privacyMode: true,
	privacyText: "Task",
}

export default class ObsidianTaskHeroRewards extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady( () => {
			if(!this.app.plugins.plugins['obsidian-tasks-plugin']) {
				new Notice("The Obsidian Task Hero Rewards Plugin requires the obsidian-tasks-plugin. Please wait to enabled it until the tasks plugin is installed and enabled.");
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if(evt.srcElement && evt.srcElement.classList.contains('task-list-item-checkbox') && evt.srcElement.checked) {
				var taskText = evt.srcElement.parentElement.parentElement.querySelector('.cm-list-1').innerText;
				this.sendTrackerPoint(taskText);
			}
		});


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async sendTrackerPoint(taskText: string) {
		if(!this.settings.apiKey){
			new Notice("You must set an API key in the settings to get TaskHero rewards.")
		}
		if(!taskText) {
			return;
		}

		var textToSend = taskText;
		if(this.settings.privacyMode) {
			textToSend = this.settings.privacyText;
		}

		const headers = new Headers();
		headers.append("Content-Type", "application/json");
		const requestOptions = {
			method: "POST",
			headers: headers,
			body: JSON.stringify({
				"apiKey": this.settings.apiKey,
				"value": this.settings.trackerPointCount,
				"description": textToSend,
				"sourceId": "Obsdian TaskHero Rewards"
			}),
			redirect: "follow"
		};

		fetch("https://taskhero-functions-2.fly.dev/apiCreateTrackerPoint", requestOptions)
		.then((response) => new Notice("Tracker Point Rewarded in TaskHero!🎉"))
		.catch((error) =>  new Notice("Error awarding tracker point!\n" + error));
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianTaskHeroRewards;

	constructor(app: App, plugin: ObsidianTaskHeroRewards) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Api Key')
			.setDesc('Your API key, you can find this in the settings of your TaskHero app.')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Tracker Point Count')
			.setDesc('How many Tracker Points to give you each time you complete a task.')
			.addSlider(slider => slider
				.setLimits(1,10,1)
				.setValue(this.plugin.settings.trackerPointCount)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.trackerPointCount = value;
					await this.plugin.saveSettings();
				}));

		var privacyTextWidget : Setting;
		
		new Setting(containerEl)
			.setName('Privacy Mode')
			.setDesc('When privacy mode is enabled, the text below is sent for each task. Whith Privacy mode disabled, the text of the task is sent instead.')
			.addToggle(toggle => toggle.setValue(this.plugin.settings.privacyMode)
			.onChange(async (value) => {
				this.plugin.settings.privacyMode = value;
				await this.plugin.saveSettings();
				privacyTextWidget.setDisabled(!value);
			}))

		privacyTextWidget = new Setting(containerEl)
			.setName('Privacy Text')
			.setDesc('When privacy mode is enabled, this text is used for every Tracker Point.')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.privacyText)
				.onChange(async (value) => {
					this.plugin.settings.privacyText = value;
					await this.plugin.saveSettings();
				}));
	}
}

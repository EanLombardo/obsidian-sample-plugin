import { App, Notice, Plugin, PluginSettingTab, Setting, requestUrl, RequestUrlParam } from 'obsidian';

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
	hasCheckedWarnings: boolean = false;

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			if (!this.hasCheckedWarnings) {
				this.hasCheckedWarnings = true;
				this.maybeWarnAboutAPIKey();
				if (!(this.app as any).plugins.plugins['obsidian-tasks-plugin']) {
					new Notice("The Task Hero Rewards plugin requires the obsidian-tasks-plugin. Please wait to enabled it until the tasks plugin is installed and enabled.");
				}
			}
		});

		this.addSettingTab(new SettingTab(this.app, this));

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if (!(evt.target instanceof HTMLInputElement)) {
				return;
			}
			let checkbox: HTMLInputElement = evt.target as HTMLInputElement;
			if (checkbox.classList.contains('task-list-item-checkbox') && checkbox) {
				let textLine: Element | undefined | null = checkbox?.parentElement?.parentElement?.querySelector('.cm-list-1');
				if (textLine && textLine instanceof HTMLElement) {
					this.sendTrackerPoint(textLine.innerText);
				}

			}
		});
	}

	// Warns the user that they need to configure an API key if they don't have one.
	// Returns whether or not a warning was displayed.
	maybeWarnAboutAPIKey(): boolean {
		if (!this.settings.apiKey) {
			new Notice("The TaskHero Rewards plugin needs to be configured with an API key. Please set one in the settings.");
			return false;
		}
		return false;
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async sendTrackerPoint(taskText: string) {
		if (this.maybeWarnAboutAPIKey()) {
			return;
		}

		let textToSend: string = taskText;
		if (this.settings.privacyMode) {
			textToSend = this.settings.privacyText;
		}

		const requestOptions: RequestUrlParam = {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			url: "https://taskhero-functions-2.fly.dev/apiCreateTrackerPoint",
			body: JSON.stringify({
				"apiKey": this.settings.apiKey,
				"value": this.settings.trackerPointCount,
				"description": textToSend,
				"sourceId": "Obsdian TaskHero Rewards"
			}),
		};

		requestUrl(requestOptions)
			.then((response) => new Notice("Tracker Point Rewarded in TaskHero!🎉"))
			.catch((error) => new Notice("Error awarding tracker point!\n" + error));
	}
}

class SettingTab extends PluginSettingTab {
	plugin: ObsidianTaskHeroRewards;

	constructor(app: App, plugin: ObsidianTaskHeroRewards) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

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
				.setLimits(1, 10, 1)
				.setValue(this.plugin.settings.trackerPointCount)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.trackerPointCount = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Privacy Mode')
			.setDesc('When privacy mode is enabled, the text below is sent for each task. Whith Privacy mode disabled, the text of the task is sent instead.')
			.addToggle(toggle => toggle.setValue(this.plugin.settings.privacyMode)
				.onChange(async (value) => {
					this.plugin.settings.privacyMode = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
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

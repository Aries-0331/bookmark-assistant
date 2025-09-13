import { useEffect, useState } from "react";
import { 
	listAvailableDatabases, 
	type DatabaseOption,
	DATABASE_CREATION_OPTIONS,
	DEFAULT_CUSTOM_PROPERTIES,
	type CustomDatabaseConfig,
	testTemplateAccess,
	createBookmarkDatabase,
	TEMPLATE_DUPLICATION_GUIDE,
	extractDatabaseIdFromUrl,
	validateDuplicatedTemplate
} from "../lib/notion";

export default function Options() {
	const [token, setToken] = useState<string | null>(null);
	const [databaseId, setDatabaseId] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [availableDatabases, setAvailableDatabases] = useState<
		DatabaseOption[]
	>([]);
	const [selectedDatabase, setSelectedDatabase] = useState<string>("");
	const [showDatabaseCreation, setShowDatabaseCreation] = useState(false);
	const [selectedCreationMethod, setSelectedCreationMethod] = useState<'template' | 'duplicate' | 'custom'>('duplicate');
	const [templateAccessible, setTemplateAccessible] = useState<boolean | null>(null);
	const [customConfig, setCustomConfig] = useState<CustomDatabaseConfig>({
		title: "📚 Chrome Bookmarks (Custom)",
		properties: { ...DEFAULT_CUSTOM_PROPERTIES }
	});
	const [duplicatedTemplateUrl, setDuplicatedTemplateUrl] = useState<string>("");
	const [templateValidation, setTemplateValidation] = useState<{
		isValid: boolean;
		error?: string;
		databaseInfo?: any;
	} | null>(null);

	// Load data from storage on mount
	useEffect(() => {
		chrome.storage.local.get(
			["notion_token", "notion_database_id"],
			async (res) => {
				if (res.notion_token) {
					setToken(res.notion_token);
					await loadAvailableDatabases();
					await checkTemplateAccess();
				}
				if (res.notion_database_id) {
					setDatabaseId(res.notion_database_id);
					setSelectedDatabase(res.notion_database_id);
				}
			},
		);
	}, []);

	async function handleConnect() {
		setLoading(true);
		setMessage(null);

		chrome.runtime.sendMessage({ type: "NOTION_OAUTH" }, async (res) => {
			if (res.ok) {
				setToken(res.token);
				setMessage({
					type: "success",
					text: "🎉 Connected to Notion! You can now sync bookmarks automatically.",
				});
				await loadAvailableDatabases();
			} else {
				setMessage({ type: "error", text: `Failed to connect: ${res.error}` });
			}
			setLoading(false);
		});
	}

	async function loadAvailableDatabases() {
		try {
			const databases = await listAvailableDatabases();
			setAvailableDatabases(databases);
		} catch (error) {
			console.warn("Failed to load databases:", error);
		}
	}

	async function checkTemplateAccess() {
		try {
			const result = await testTemplateAccess();
			setTemplateAccessible(result.accessible);
			if (!result.accessible) {
				console.warn("Template not accessible:", result.error);
			}
		} catch (error) {
			console.error("Failed to test template access:", error);
			setTemplateAccessible(false);
		}
	}

	async function handleCreateDatabase() {
		setLoading(true);
		setMessage(null);

		try {
			let result;
			if (selectedCreationMethod === 'duplicate') {
				// Extract database ID from the duplicated template URL
				const databaseId = extractDatabaseIdFromUrl(duplicatedTemplateUrl);
				if (!databaseId) {
					throw new Error("Please enter a valid Notion page URL for your duplicated template");
				}
				result = await createBookmarkDatabase('duplicate', undefined, databaseId);
			} else if (selectedCreationMethod === 'template') {
				result = await createBookmarkDatabase('template');
			} else {
				result = await createBookmarkDatabase('custom', customConfig);
			}

			// Store the new database ID
			await chrome.storage.local.set({ notion_database_id: result.id });
			setDatabaseId(result.id);
			setSelectedDatabase(result.id);
			setShowDatabaseCreation(false);

			setMessage({
				type: "success",
				text: `✅ Database "${result.name}" created successfully!`
			});

			// Refresh available databases
			await loadAvailableDatabases();

		} catch (error: any) {
			setMessage({
				type: "error",
				text: `Failed to create database: ${error.message}`
			});
		} finally {
			setLoading(false);
		}
	}

	async function handleValidateDuplicatedTemplate() {
		if (!duplicatedTemplateUrl.trim()) {
			setTemplateValidation({ isValid: false, error: "Please enter a URL" });
			return;
		}

		const databaseId = extractDatabaseIdFromUrl(duplicatedTemplateUrl);
		if (!databaseId) {
			setTemplateValidation({ isValid: false, error: "Invalid Notion URL format" });
			return;
		}

		setLoading(true);
		try {
			const validation = await validateDuplicatedTemplate(databaseId);
			setTemplateValidation(validation);
		} catch (error: any) {
			setTemplateValidation({ isValid: false, error: error.message });
		} finally {
			setLoading(false);
		}
	}

	function handleCustomPropertyToggle(propertyName: string) {
		setCustomConfig(prev => ({
			...prev,
			properties: {
				...prev.properties,
				[propertyName]: {
					...prev.properties[propertyName],
					enabled: !prev.properties[propertyName].enabled
				}
			}
		}));
	}

	async function handleSelectDatabase() {
		if (!selectedDatabase) return;

		setLoading(true);
		setMessage(null);

		try {
			await chrome.storage.local.set({ notion_database_id: selectedDatabase });
			setDatabaseId(selectedDatabase);
			const selectedDb = availableDatabases.find(
				(db) => db.id === selectedDatabase,
			);
			setMessage({
				type: "success",
				text: `Selected database: "${selectedDb?.name}"! You can now sync your bookmarks.`,
			});
		} catch {
			setMessage({ type: "error", text: "Failed to save database selection" });
		} finally {
			setLoading(false);
		}
	}

	async function handleDisconnect() {
		await chrome.storage.local.remove(["notion_token", "notion_database_id"]);
		setToken(null);
		setDatabaseId("");
		setSelectedDatabase("");
		setAvailableDatabases([]);
		setMessage({ type: "success", text: "Disconnected from Notion" });
	}

	return (
		<div className="max-w-2xl mx-auto p-6 space-y-6">
			<div className="border-b pb-4">
				<h1 className="text-2xl font-bold text-gray-900">
					Notion Bookmark Sync Settings
				</h1>
				<p className="text-gray-600 mt-1">
					Connect to Notion and start syncing your bookmarks automatically
				</p>
			</div>

			{/* Status Messages */}
			{message && (
				<div
					className={`p-4 rounded-lg border ${
						message.type === "success"
							? "bg-green-50 border-green-200 text-green-800"
							: "bg-red-50 border-red-200 text-red-800"
					}`}
				>
					<div className="flex items-center gap-2">
						{message.type === "success" ? (
							<svg
								className="w-5 h-5 text-green-600"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
						) : (
							<svg
								className="w-5 h-5 text-red-600"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						)}
						<span className="text-sm font-medium">{message.text}</span>
					</div>
				</div>
			)}

			{/* Connection Status */}
			<div className="bg-gray-50 p-4 rounded-lg">
				<h2 className="text-lg font-semibold mb-3">Connection Status</h2>
				<div className="flex items-center gap-3">
					<div
						className={`w-6 h-6 rounded-full flex items-center justify-center ${
							token ? "bg-green-500" : "bg-gray-300"
						}`}
					>
						{token ? (
							<svg
								className="w-4 h-4 text-white"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						) : (
							<span className="text-white text-xs font-bold">1</span>
						)}
					</div>
					<span
						className={`text-sm ${
							token ? "text-green-700 font-medium" : "text-gray-600"
						}`}
					>
						{token ? "✅ Connected to Notion" : "Connect to Notion"}
					</span>
				</div>
				{token && (
					<div className="mt-3 p-3 bg-green-100 rounded-lg">
						<p className="text-sm text-green-800 font-medium">
							🚀 Ready to sync! Your database will be created automatically when
							you sync your first bookmark.
						</p>
					</div>
				)}
			</div>

			{/* Main Connection Section */}
			<div className="bg-white border border-gray-200 rounded-lg p-6">
				<h2 className="text-lg font-semibold mb-4">Connect to Notion</h2>

				{token ? (
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-green-500 rounded-full" />
							<span className="text-green-700 font-medium">
								Connected to Notion
							</span>
						</div>

						{databaseId && (
							<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
								<p className="text-sm text-blue-800">
									📚 <strong>Database ready:</strong>{" "}
									<code className="bg-blue-100 px-2 py-1 rounded font-mono text-xs">
										{databaseId}
									</code>
								</p>
							</div>
						)}

						<button
							onClick={handleDisconnect}
							disabled={loading}
							className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-red-400 transition-colors"
						>
							Disconnect
						</button>
					</div>
				) : (
					<div className="space-y-4">
						<p className="text-gray-600 text-sm">
							Connect your Notion account to enable automatic bookmark syncing.
							Your database will be created automatically when needed.
						</p>
						<button
							onClick={handleConnect}
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
						>
							{loading && (
								<div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
							)}
							Connect to Notion
						</button>
					</div>
				)}

				{/* How it works */}
				<div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
					<h3 className="text-sm font-semibold text-blue-900 mb-2">
						✨ How it works:
					</h3>
					<ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
						<li>Connect your Notion account with one click</li>
						<li>Start syncing bookmarks - database creates automatically</li>
						<li>
							Perfect structure: Title, URL, Description, Created Date, etc.
						</li>
						<li>No manual setup required!</li>
					</ul>
				</div>

				{/* Database Creation Options */}
				{token && !databaseId && (
					<div className="mt-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">
								Database Setup
							</h3>
							{!showDatabaseCreation && (
								<button
									onClick={() => setShowDatabaseCreation(true)}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
									</svg>
									Create Database
								</button>
							)}
						</div>

						{showDatabaseCreation && (
							<div className="border border-gray-200 rounded-lg p-6 bg-white">
								<h4 className="text-md font-semibold mb-4">Choose Database Creation Method</h4>
								
								{/* Method Selection */}
								<div className="space-y-3 mb-6">
									{DATABASE_CREATION_OPTIONS.map((option) => (
										<label
											key={option.type}
											className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
												selectedCreationMethod === option.type
													? 'border-blue-500 bg-blue-50'
													: 'border-gray-200 hover:border-gray-300'
											}`}
										>
											<input
												type="radio"
												name="creationMethod"
												value={option.type}
												checked={selectedCreationMethod === option.type}
												onChange={(e) => setSelectedCreationMethod(e.target.value as 'template' | 'duplicate' | 'custom')}
												className="mt-1"
											/>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<span className="font-medium">{option.name}</span>
													{option.recommended && (
														<span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
															Recommended
														</span>
													)}
													{option.type === 'template' && templateAccessible === false && (
														<span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
															Template not shared
														</span>
													)}
													{option.type === 'template' && templateAccessible === true && (
														<span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
															Template ready
														</span>
													)}
												</div>
												<p className="text-sm text-gray-600">{option.description}</p>
											</div>
										</label>
									))}
								</div>

								{/* Template Duplication Method Details */}
								{selectedCreationMethod === 'duplicate' && (
									<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
										<h5 className="font-medium mb-3 text-green-800">🎨 Template Duplication Guide</h5>
										<div className="space-y-3 text-sm text-green-700">
											<div>
												<p className="font-medium mb-2">Follow these steps:</p>
												<ol className="list-decimal list-inside space-y-1 ml-2">
													{TEMPLATE_DUPLICATION_GUIDE.steps.map((step, index) => (
														<li key={index}>{step}</li>
													))}
												</ol>
											</div>
											
											<div className="flex gap-2">
												<a
													href={TEMPLATE_DUPLICATION_GUIDE.templateUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
												>
													🔗 Open Template
												</a>
											</div>

											<div className="space-y-2">
												<label className="block text-sm font-medium text-green-800">
													Paste your duplicated template URL:
												</label>
												<div className="flex gap-2">
													<input
														type="url"
														value={duplicatedTemplateUrl}
														onChange={(e) => {
															setDuplicatedTemplateUrl(e.target.value);
															setTemplateValidation(null); // Reset validation when URL changes
														}}
														placeholder="https://www.notion.so/your-duplicated-template-..."
														className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
													/>
													<button
														onClick={handleValidateDuplicatedTemplate}
														disabled={loading || !duplicatedTemplateUrl.trim()}
														className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm"
													>
														Validate
													</button>
												</div>
											</div>

											{templateValidation && (
												<div className={`p-3 rounded ${
													templateValidation.isValid 
														? 'bg-green-100 border border-green-300' 
														: 'bg-red-100 border border-red-300'
												}`}>
													{templateValidation.isValid ? (
														<div>
															<p className="text-green-800 font-medium">✅ Template validated successfully!</p>
															{templateValidation.databaseInfo && (
																<div className="text-xs text-green-700 mt-1">
																	<p>Database: {templateValidation.databaseInfo.title}</p>
																	<p>Properties: {templateValidation.databaseInfo.properties.join(', ')}</p>
																</div>
															)}
														</div>
													) : (
														<p className="text-red-800">❌ {templateValidation.error}</p>
													)}
												</div>
											)}

											<div className="text-xs text-green-600">
												<p className="font-medium">💡 Troubleshooting:</p>
												<ul className="list-disc list-inside space-y-1 ml-2">
													{TEMPLATE_DUPLICATION_GUIDE.troubleshooting.map((tip, index) => (
														<li key={index}>{tip}</li>
													))}
												</ul>
											</div>
										</div>
									</div>
								)}

								{/* Template Method Details */}
								{selectedCreationMethod === 'template' && (
									<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
										{templateAccessible === true ? (
											<div>
												<p className="text-sm text-blue-800 mb-2">
													✅ Template is accessible and ready to use!
												</p>
												<p className="text-xs text-blue-700">
													This will create a database with our optimized schema including hidden internal properties.
												</p>
											</div>
										) : templateAccessible === false ? (
											<div>
												<p className="text-sm text-red-800 mb-2">
													❌ Template database is not shared with your integration.
												</p>
												<p className="text-xs text-red-700">
													Please share template ID 2659466d-e76d-8071-b304-f2e6654873bd with your Notion integration.
												</p>
											</div>
										) : (
											<p className="text-sm text-gray-600">
												🔍 Checking template accessibility...
											</p>
										)}
									</div>
								)}

								{/* Custom Method Details */}
								{selectedCreationMethod === 'custom' && (
									<div className="mb-6">
										<h5 className="font-medium mb-3">Customize Properties</h5>
										<div className="space-y-2 mb-4">
											<input
												type="text"
												value={customConfig.title}
												onChange={(e) => setCustomConfig(prev => ({ ...prev, title: e.target.value }))}
												placeholder="Database title..."
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
											/>
										</div>
										<div className="grid grid-cols-2 gap-3">
											{Object.entries(customConfig.properties).map(([propName, propConfig]) => (
												<label
													key={propName}
													className="flex items-center gap-2 p-2 border border-gray-200 rounded"
												>
													<input
														type="checkbox"
														checked={propConfig.enabled}
														onChange={() => handleCustomPropertyToggle(propName)}
														disabled={propName === 'Title' || propName === 'URL'} // Required properties
													/>
													<span className={`text-sm ${!propConfig.enabled ? 'text-gray-400' : ''}`}>
														{propName}
													</span>
													<span className="text-xs text-gray-400">
														({propConfig.type})
													</span>
												</label>
											))}
										</div>
										<p className="text-xs text-gray-600 mt-2">
											* Title and URL are required and cannot be disabled
										</p>
									</div>
								)}

								{/* Action Buttons */}
								<div className="flex gap-3">
									<button
										onClick={handleCreateDatabase}
										disabled={
											loading || 
											(selectedCreationMethod === 'template' && templateAccessible === false) ||
											(selectedCreationMethod === 'duplicate' && (!templateValidation?.isValid))
										}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
									>
										{loading && (
											<div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
										)}
										{selectedCreationMethod === 'duplicate' ? 'Use Duplicated Template' : 'Create Database'}
									</button>
									<button
										onClick={() => setShowDatabaseCreation(false)}
										disabled={loading}
										className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Advanced Options - Optional */}
				{token && availableDatabases.length > 0 && (
					<details className="mt-4">
						<summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 mb-3">
							⚙️ Advanced: Use existing database
						</summary>
						<div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
							<p className="text-sm text-gray-600 mb-3">
								If you prefer to use an existing database, select it below:
							</p>
							<select
								value={selectedDatabase}
								onChange={(e) => setSelectedDatabase(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
							>
								<option value="">Select an existing database...</option>
								{availableDatabases.map((db) => (
									<option key={db.id} value={db.id}>
										{db.name}
									</option>
								))}
							</select>
							<button
								onClick={handleSelectDatabase}
								disabled={loading || !selectedDatabase}
								className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
							>
								{loading && (
									<div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
								)}
								Use Selected Database
							</button>
						</div>
					</details>
				)}
			</div>
		</div>
	);
}

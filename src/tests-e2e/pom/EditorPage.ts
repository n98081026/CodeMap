import { type Page, type Locator, expect } from '@playwright/test';

export class EditorPage {
  readonly page: Page;

  // Toolbar principale dell'editor
  readonly addNodeButton: Locator;
  readonly saveMapButton: Locator;
  readonly aiToolsMenuButton: Locator;
  readonly layoutToolsMenuButton: Locator;
  readonly togglePropertiesButton: Locator;
  readonly toggleAiPanelButton: Locator;
  readonly toggleOverviewButton: Locator;
  // Aggiungere altri pulsanti della toolbar se necessario (es. Undo, Redo, Add Edge)

  // Elementi del menu AI Tools (da popolare con i data-tutorial-id corretti)
  readonly extractConceptsMenuItem: Locator;
  readonly suggestRelationsMenuItem: Locator;
  readonly expandConceptMenuItem: Locator;
  // Aggiungere altri item del menu AI...

  // Elementi del menu Layout Tools
  readonly dagreTidyMenuItem: Locator;
  // Aggiungere altri item del menu Layout...

  // Canvas e Nodi
  readonly reactFlowPane: Locator;

  // Pannello Proprietà (sezione base)
  readonly nodeTextInput: Locator;
  readonly edgeLabelInput: Locator;

  // AI Suggestion Panel
  readonly aiSuggestionPanel: Locator;
  readonly extractedConceptsSection: Locator;
  readonly suggestedRelationsSection: Locator;
  readonly addSelectedConceptsButton: Locator;
  readonly addSelectedRelationsButton: Locator;

  // AI Staging Toolbar
  readonly stagingToolbar: Locator;
  readonly stagingCommitAllButton: Locator;
  readonly stagingDiscardAllButton: Locator;

  // Ghost Preview Toolbar
  readonly ghostPreviewToolbar: Locator;
  readonly ghostAcceptButton: Locator;
  readonly ghostCancelButton: Locator;

  // Modali (localizzatori di base per i dialoghi, i campi specifici verranno presi da qui)
  readonly extractConceptsModal: Locator;
  readonly suggestRelationsModal: Locator;
  readonly expandConceptModal: Locator;


  constructor(page: Page) {
    this.page = page;

    // Toolbar
    this.addNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    this.saveMapButton = page.locator("button[data-tutorial-id='editor-save-map']");
    this.aiToolsMenuButton = page.locator("button[aria-label='AI Tools']");
    this.layoutToolsMenuButton = page.locator("button[aria-label='Layout Tools']");
    this.togglePropertiesButton = page.locator('#tutorial-target-toggle-properties-button');
    this.toggleAiPanelButton = page.locator("button[data-tutorial-id='editor-toggle-ai-panel']");
    this.toggleOverviewButton = page.locator("button[data-tutorial-id='toolbar-toggle-project-overview']");

    // Menu Items (devono essere cliccati dopo aver aperto il menu)
    this.extractConceptsMenuItem = page.locator("button[data-tutorial-id='ai-tool-extract-concepts']");
    this.suggestRelationsMenuItem = page.locator("button[data-tutorial-id='ai-tool-suggest-relations']");
    this.expandConceptMenuItem = page.locator("button[data-tutorial-id='ai-tool-expand-concept']");
    this.dagreTidyMenuItem = page.locator("button[data-tutorial-id='layout-tool-dagre-tidy']");

    // Canvas
    this.reactFlowPane = page.locator('.react-flow__pane');

    // Pannello Proprietà
    this.nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");
    this.edgeLabelInput = page.locator("input[data-tutorial-id='properties-inspector-edge-label-input']");

    // AI Suggestion Panel
    this.aiSuggestionPanel = page.locator("div[data-tutorial-id='ai-suggestion-panel']");
    this.extractedConceptsSection = this.aiSuggestionPanel.locator("div[data-tutorial-id='extracted-concepts-section']");
    this.suggestedRelationsSection = this.aiSuggestionPanel.locator("div[data-tutorial-id='suggested-relations-section']");
    this.addSelectedConceptsButton = this.aiSuggestionPanel.locator("button[data-tutorial-id='add-selected-concepts-button']");
    this.addSelectedRelationsButton = this.aiSuggestionPanel.locator("button[data-tutorial-id='add-selected-relations-button']");

    // AI Staging Toolbar
    this.stagingToolbar = page.locator("div[data-tutorial-id='ai-staging-toolbar']");
    this.stagingCommitAllButton = this.stagingToolbar.locator("button[data-tutorial-id='staging-toolbar-accept-all']");
    this.stagingDiscardAllButton = this.stagingToolbar.locator("button[data-tutorial-id='staging-toolbar-clear-all']");

    // Ghost Preview Toolbar
    this.ghostPreviewToolbar = page.locator("div[data-tutorial-id='ghost-preview-toolbar']");
    this.ghostAcceptButton = this.ghostPreviewToolbar.locator("button[data-tutorial-id='ghost-toolbar-accept']");
    this.ghostCancelButton = this.ghostPreviewToolbar.locator("button[data-tutorial-id='ghost-toolbar-cancel']");

    // Modali
    this.extractConceptsModal = page.locator("[data-tutorial-id='extract-concepts-modal-content']");
    this.suggestRelationsModal = page.locator("[data-tutorial-id='suggest-relations-modal']");
    this.expandConceptModal = page.locator("div[id='tutorial-target-expand-concept-modal']");
  }

  // --- Metodi per la Toolbar ---
  async clickAddNode() {
    await this.addNodeButton.click();
    console.log("POM: Add Node button clicked.");
  }

  async clickSaveMap() {
    await this.saveMapButton.click();
    console.log("POM: Save Map button clicked.");
  }

  async openAIToolsMenu() {
    await this.aiToolsMenuButton.click();
    console.log("POM: AI Tools menu opened.");
  }

  async selectAITool(toolName: 'Extract Concepts' | 'Suggest Relations' | 'Expand Concept' /* | ...altri tool */) {
    await this.openAIToolsMenu();
    switch (toolName) {
      case 'Extract Concepts':
        await this.extractConceptsMenuItem.click();
        break;
      case 'Suggest Relations':
        await this.suggestRelationsMenuItem.click();
        break;
      case 'Expand Concept':
        await this.expandConceptMenuItem.click();
        break;
      default:
        throw new Error(`AI Tool "${toolName}" not recognized in EditorPage POM.`);
    }
    console.log(`POM: AI Tool "${toolName}" selected.`);
  }

  async openLayoutToolsMenu() {
    await this.layoutToolsMenuButton.click();
    console.log("POM: Layout Tools menu opened.");
  }

  async selectLayoutTool(toolName: 'Dagre Tidy' /* | ...altri tool */) {
    await this.openLayoutToolsMenu();
    switch (toolName) {
      case 'Dagre Tidy':
        await this.dagreTidyMenuItem.click();
        break;
      default:
        throw new Error(`Layout Tool "${toolName}" not recognized in EditorPage POM.`);
    }
    console.log(`POM: Layout Tool "${toolName}" selected.`);
  }

  async togglePropertiesPanel() {
    await this.togglePropertiesButton.click();
    console.log("POM: Toggle Properties Panel button clicked.");
  }

  async ensurePropertiesPanelNodeTextVisible() {
    if (!await this.nodeTextInput.isVisible({ timeout: 2000 })) {
      await this.togglePropertiesPanel();
      await expect(this.nodeTextInput).toBeVisible({ timeout: 5000 });
    }
  }

  async toggleAiPanel() {
    await this.toggleAiPanelButton.click();
    console.log("POM: Toggle AI Panel button clicked.");
  }

  async ensureAiPanelVisible() {
    if (!await this.aiSuggestionPanel.isVisible({timeout: 2000})) {
        await this.toggleAiPanelButton.click();
        await expect(this.aiSuggestionPanel).toBeVisible({ timeout: 5000 });
    }
  }

  async toggleOverviewMode() {
    await this.toggleOverviewButton.click();
    console.log("POM: Toggle Project Overview button clicked.");
  }

  // --- Metodi per la Canvas ---
  async getNodesOnCanvas() {
    return this.page.locator('.react-flow__node');
  }

  async getNodeById(nodeId: string) {
    return this.page.locator(`.react-flow__node[data-id="${nodeId}"]`);
  }

  async getFirstNode() {
    return (await this.getNodesOnCanvas()).first();
  }

  // --- Metodi per il Pannello Proprietà ---
  async setNodeText(text: string) {
    await this.ensurePropertiesPanelNodeTextVisible();
    await this.nodeTextInput.fill(text);
    await expect(this.nodeTextInput).toHaveValue(text);
    console.log(`POM: Node text set to "${text}".`);
    // Deselect input by focusing on something else
    await this.saveMapButton.focus();
  }

  // --- Metodi per l'AI Suggestion Panel ---
  async getExtractedConceptItemByText(partialText: string) {
    await this.ensureAiPanelVisible();
    await expect(this.extractedConceptsSection).toBeVisible({timeout: 15000});
    return this.extractedConceptsSection.locator(`div[data-tutorial-id^='extracted-concept-item-']:has-text("${partialText}")`).first();
  }

  async getSuggestedRelationItemByParts(node1Text: string, node2Text: string) {
    await this.ensureAiPanelVisible();
    await expect(this.suggestedRelationsSection).toBeVisible({timeout: 15000});
    return this.suggestedRelationsSection.locator(
        `div[data-tutorial-id^='suggested-relation-item-']:has-text("${node1Text}"):has-text("${node2Text}")`
      ).first();
  }

  async clickAddSelectedConcepts() {
    await this.addSelectedConceptsButton.click();
    console.log("POM: Clicked 'Add Selected Concepts'.");
  }

  async clickAddSelectedRelations() {
    await this.addSelectedRelationsButton.click();
    console.log("POM: Clicked 'Add Selected Relations'.");
  }

  // --- Metodi per AI Staging Toolbar ---
  async commitStagedItems() {
    await expect(this.stagingCommitAllButton).toBeEnabled({timeout: 5000});
    await this.stagingCommitAllButton.click();
    console.log("POM: Clicked 'Commit All' on Staging Toolbar.");
  }

  async discardStagedItems() {
    await expect(this.stagingDiscardAllButton).toBeEnabled({timeout: 5000});
    await this.stagingDiscardAllButton.click();
    console.log("POM: Clicked 'Discard All' on Staging Toolbar.");
  }

  // --- Metodi per Ghost Preview Toolbar ---
  async acceptGhostLayout() {
    await expect(this.ghostAcceptButton).toBeEnabled({timeout: 5000});
    await this.ghostAcceptButton.click();
    console.log("POM: Clicked 'Accept Layout' on Ghost Toolbar.");
  }

  async cancelGhostLayout() {
    await expect(this.ghostCancelButton).toBeEnabled({timeout: 5000});
    await this.ghostCancelButton.click();
    console.log("POM: Clicked 'Cancel Layout' on Ghost Toolbar.");
  }

  // --- Metodi per Modali AI ---
  async submitExtractConceptsModal(expectedPrefillText?: string) {
    await expect(this.extractConceptsModal).toBeVisible({ timeout: 10000 });
    if (expectedPrefillText) {
      const modalTextarea = this.extractConceptsModal.locator('textarea[name="textToExtract"]');
      await expect(modalTextarea).toHaveValue(expectedPrefillText, { timeout: 5000 });
    }
    await this.extractConceptsModal.locator("button[data-tutorial-id='extract-concepts-submit-button']").click();
    await expect(this.extractConceptsModal).not.toBeVisible({ timeout: 15000 });
    console.log("POM: Extract Concepts modal submitted and closed.");
  }

  async submitSuggestRelationsModal(customPrompt?: string) {
    await expect(this.suggestRelationsModal).toBeVisible({ timeout: 10000 });
    if (customPrompt) {
      await this.suggestRelationsModal.locator("[data-tutorial-id='suggest-relations-custom-prompt-input']").fill(customPrompt);
    }
    await this.suggestRelationsModal.locator("button[data-tutorial-id='suggest-relations-submit']").click();
    await expect(this.suggestRelationsModal).not.toBeVisible({ timeout: 20000 });
    console.log("POM: Suggest Relations modal submitted and closed.");
  }

  async submitExpandConceptModal(conceptText: string, refinementPrompt?: string) {
    await expect(this.expandConceptModal).toBeVisible({ timeout: 10000 });
    const conceptInput = this.expandConceptModal.locator('input[name="conceptToExpand"]');
    await expect(conceptInput).toHaveValue(conceptText, {timeout:5000}); // Verify prefill

    if (refinementPrompt) {
      await this.expandConceptModal.locator("textarea[id='tutorial-target-expand-concept-input']").fill(refinementPrompt);
    }
    await this.expandConceptModal.locator("button[id='tutorial-target-expand-concept-confirm-button']").click();
    await expect(this.expandConceptModal).not.toBeVisible({ timeout: 30000 });
    console.log("POM: Expand Concept modal submitted and closed.");
  }
}

import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import Joyride, { CallBackProps, STATUS, Step, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/auth-context';
import useConceptMapStore from '@/stores/concept-map-store'; // Import concept map store
import useTutorialStore from '@/stores/tutorial-store';
import type { LucideIcon } from 'lucide-react'; // For potential icons in metadata

export interface TutorialMetaData {
  key: string;
  title: string;
  description?: string;
  icon?: LucideIcon; // Optional: for future use in a richer menu
}

// Define this metadata where it's accessible, e.g., here or in a separate definitions file.
export const availableTutorials: TutorialMetaData[] = [
  { key: 'dashboardTutorial', title: '儀表板導覽' },
  { key: 'projectUploadTutorial', title: '專案上傳與AI分析指引' },
  { key: 'editorTutorial', title: '編輯器基礎操作' },
  { key: 'extractConceptsToolTutorial', title: 'AI工具：提取概念' },
  { key: 'manualAddNodeTutorial', title: '手動添加節點與編輯' },
  { key: 'manualCreateEdgeTutorial', title: '手動創建連接邊' },
  { key: 'suggestRelationsToolTutorial', title: 'AI工具：建議關係' },
  // Add more tutorials here as they are created
];

interface AppTutorialProps {
  // Props are not used as state is managed by stores
}

const AppTutorial: React.FC<AppTutorialProps> = () => {
  const { user, loading } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);

  const {
    activeTutorialKey,
    runTutorial,
    currentStepIndex,
    setRunTutorialState,
    setStepIndex,
  } = useTutorialStore(
    useCallback(s => ({
      activeTutorialKey: s.activeTutorialKey,
      runTutorial: s.runTutorial,
      currentStepIndex: s.currentStepIndex,
      setRunTutorialState: s.setRunTutorialState,
      setStepIndex: s.setStepIndex,
    }), [])
  );

  const tutorialTempTargetNodeId = useConceptMapStore(state => state.tutorialTempTargetNodeId);
  const clearTutorialTempTargetNodeId = useConceptMapStore(state => state.setTutorialTempTargetNodeId);
  const tutorialTempTargetEdgeId = useConceptMapStore(state => state.tutorialTempTargetEdgeId); // Get new state
  const clearTutorialTempTargetEdgeId = useConceptMapStore(state => state.setTutorialTempTargetEdgeId); // Get new action

  const getStepsForTutorial = useCallback((
    key: string,
    dynamicNodeId?: string | null,
    dynamicEdgeId?: string | null // Add dynamicEdgeId
  ): Step[] => {
    // console.log(`getStepsForTutorial called for key: ${key}, dynamicNodeId: ${dynamicNodeId}, dynamicEdgeId: ${dynamicEdgeId}`);
    const commonWelcomeStep: Step = {
      target: 'body',
      content: '歡迎使用 CodeMap！這是一個幫助您理解和可視化代碼結構的工具。',
      placement: 'center',
      title: '歡迎！',
      disableBeacon: true,
    };

    const commonNavSteps: Step[] = [
      {
        target: '.sidebar-nav-container', // Updated placeholder
        content: '這裡是主導航欄，您可以根據您的角色訪問不同功能區。',
        placement: 'right',
        title: '導航欄',
      },
      {
        target: '.main-layout-content-area', // Updated placeholder
        content: '這個區域將顯示您選擇的功能頁面和主要內容。',
        placement: 'auto',
        title: '主內容區',
      },
      {
        target: '.navbar-user-button', // Updated placeholder
        content: '點擊這裡可以管理您的個人資料或登出。',
        placement: 'bottom-end',
        title: '用戶菜單',
      },
    ];

    if (key === 'dashboardTutorial') {
      let roleSpecificSteps: Step[] = [];
      if (user?.role === 'STUDENT') {
        roleSpecificSteps = [
          {
            target: "a[href='/student/concept-maps']", // More specific selector
            content: '在這裡您可以查看和管理您的概念圖。',
            title: '我的概念圖',
          },
          {
            target: "a[href='/student/projects/submit']", // More specific selector
            content: '點擊此處上傳您的專案並通過AI自動生成概念圖。',
            title: '提交專案',
          },
        ];
      } else if (user?.role === 'TEACHER') {
        roleSpecificSteps = [
          {
            target: "a[href='/teacher/classrooms']", // More specific selector
            content: '在這裡您可以管理您的教室和學生。',
            title: '管理教室',
          },
        ];
      } else if (user?.role === 'ADMIN') {
        roleSpecificSteps = [
          {
            target: "a[href='/admin/users']", // More specific selector
            content: '管理平台的所有用戶。',
            title: '用戶管理',
          },
          {
            target: "a[href='/admin/settings']", // More specific selector
            content: '配置系統級別的設定。',
            title: '系統設定',
          },
        ];
      }
      return [commonWelcomeStep, ...commonNavSteps, ...roleSpecificSteps];
    } else if (key === 'projectUploadTutorial') {
      return [
        {
          target: '.project-upload-form-container', // Placeholder for the main form container
          content: '歡迎來到專案提交頁面！在這裡，您可以上傳您的代碼專案，CodeMap將通過AI分析幫助您生成概念圖。',
          placement: 'center',
          title: '專案上傳與分析',
          disableBeacon: true,
        },
        {
          target: '.file-upload-dropzone', // Placeholder for the file dropzone area
          content: '點擊或拖拽您的專案壓縮文件（如 .zip, .rar）到這裡。請確保壓縮包內包含您的源代碼。',
          title: '選擇專案文件',
        },
        {
          target: "textarea[name='userGoals']", // Assuming 'userGoals' is the name attribute
          content: '請在這裡簡要描述您希望通過AI分析達成的目標，例如：‘理解專案主要模塊’或‘梳理核心業務邏輯’。這將幫助AI更好地為您生成概念圖。',
          title: '您的分析目標',
        },
        {
          target: "button[type='submit'].submit-project-button", // Placeholder, make more specific if possible
          content: '填寫完成後，點擊這裡開始上傳和分析您的專案。',
          title: '開始分析',
        },
        // Optional: Step for AI Analysis Confirmation Dialog (if applicable and feasible to target)
        // {
        //   target: '.ai-confirmation-dialog', // Placeholder
        //   content: '提交後，系統會請求您確認啟動AI分析。請確認以繼續生成概念圖。',
        //   title: '確認AI分析',
        // },
      ];
    } else if (key === 'editorTutorial') {
      return [
        {
          target: '.concept-map-editor-container',
          content: '歡迎來到概念地圖編輯器！在這裡，您可以創建、編輯和組織您的概念圖。',
          placement: 'center',
          title: '概念地圖編輯器',
          disableBeacon: true,
        },
        {
          target: "button[data-tutorial-id='editor-save-map']",
          content: '完成編輯後，記得點擊這裡保存您的地圖。',
          title: '保存地圖',
        },
        {
          target: "button[data-tutorial-id='editor-add-node']",
          content: '點擊此按鈕在畫布上添加一個新的概念節點。',
          title: '添加節點',
        },
        {
          target: "button[data-tutorial-id='editor-add-edge']",
          content: '使用此按鈕或拖拽節點連接樁來連接兩個節點。',
          title: '添加邊',
        },
        {
          target: "button[aria-label='AI Tools']",
          content: '這裡集成了多種AI工具，可以幫助您提取概念、建議關係、擴展想法等。',
          title: 'AI 助手',
        },
        {
          target: '.react-flow__pane',
          content: '這是您的畫布區域。您可以在這裡自由拖動、排列節點和邊，創建您的概念圖結構。',
          title: '畫布區域',
        },
        {
          target: "#tutorial-target-toggle-properties-button",
          content: '點擊此按鈕打開屬性面板。當您選中一個節點或邊時，可以在屬性面板中編輯其標籤、詳細信息、樣式等。',
          title: '屬性檢查器',
        },
      ];
    } else if (key === 'extractConceptsToolTutorial') {
      return [
        {
          target: '.react-flow__pane', // Target a general area in the editor
          content: '現在來學習如何使用 AI 從節點文本中提取關鍵概念。',
          placement: 'center',
          title: 'AI工具：提取概念',
          disableBeacon: true,
        },
        {
          target: '.custom-node.selected', // Placeholder: ReactFlow adds 'selected' class to selected nodes
          content: '首先，請確保您已選中一個包含一些文本內容的節點。AI將從這個節點的標籤或詳細信息中提取概念。如果當前沒有選中的節點，請先選擇一個。',
          title: '1. 選擇節點',
        },
        {
          target: "button[aria-label='AI Tools']",
          content: '點擊AI工具按鈕，打開AI功能菜單。',
          title: '2. 打開AI菜單',
        },
        {
          // Assuming 'Extract Concepts' is a DropdownMenuItem. We'll need a specific selector for it.
          // PREFERRED: Add data-tutorial-id="ai-tool-extract-concepts" to the DropdownMenuItem
          target: "button[data-tutorial-id='ai-tool-extract-concepts']",
          content: '然後，從菜單中選擇「提取概念」。',
          title: '3. 選擇提取概念',
        },
        {
          target: "[role='dialog'][aria-labelledby='extract-concepts-title']", // Example: Target modal by role and aria-label
          content: '這是提取概念的對話框。AI會分析選中節點的文本。您可以直接點擊「提取」按鈕。',
          title: '4. 確認提取',
          placement: 'auto',
        },
        {
          target: "button[type='submit'][data-tutorial-id='extract-concepts-submit']", // Placeholder for modal submit
          content: '點擊此按鈕開始提取。',
          title: '開始提取',
        },
        {
          target: "button[data-tutorial-id='editor-toggle-ai-panel']",
          content: '提取完成後，AI生成的概念會顯示在AI建議面板中。點擊此按鈕（如果面板未打開）或查看已打開的面板。',
          title: '5. 查看結果',
        },
        {
          target: ".ai-suggestion-panel", // Placeholder for the main AI suggestion panel wrapper
          content: '在這裡，您可以看到提取出的概念列表。您可以選擇將它們添加到您的概念圖中。',
          title: 'AI建議面板',
          placement: 'top',
        },
        {
          target: 'body',
          content: '太棒了！您已經學會了如何使用AI提取概念。嘗試對其他節點使用此功能，或探索更多AI工具！',
          placement: 'center',
          title: '教程完成',
        },
      ];
    } else if (key === 'manualAddNodeTutorial') {
      return [
        {
          target: '.concept-map-editor-container',
          content: '現在我們來學習如何手動添加一個新的概念節點到畫布上。',
          placement: 'center',
          title: '手動添加節點',
          disableBeacon: true,
        },
        {
          target: "button[data-tutorial-id='editor-add-node']",
          content: '請點擊工具欄上的這個「添加節點」按鈕。一個新的節點將會出現在畫布中央。',
          title: '1. 點擊添加節點按鈕',
          // disableOverlayClicks: true, // Prevent clicking elsewhere during this step
        },
        {
          target: dynamicNodeId ? `[data-id='${dynamicNodeId}']` : '.react-flow__pane',
          content: dynamicNodeId
            ? '太棒了！一個新的「概念」節點已經添加到畫布上 (它已被高亮)。您可以拖動它來改變位置。'
            : '一個新的「概念」節點已經添加到畫布中央。請找到它。',
          title: '2. 新節點已添加',
          spotlightClicks: true, // Allow clicking on the new node to select it
        },
        {
          target: "#tutorial-target-toggle-properties-button",
          content: '很好！節點通常在添加後會自動選中。如果屬性面板沒有自動打開，請點擊此按鈕打開它。',
          title: '3. 打開屬性面板',
        },
        {
          target: "input[data-tutorial-id='properties-inspector-node-text-input']",
          content: '在屬性面板中，您可以在這個輸入框裡修改節點的名稱或標籤。試著輸入一些文字吧！',
          title: '4. 修改節點標籤',
          // Consider adding: event: 'input' and then checking if value changed, but that's more complex.
          // For now, just informational.
        },
        {
          target: "textarea[data-tutorial-id='properties-inspector-node-details-input']", // Assuming this ID will be added
          content: '您還可以在「Details」區域為節點添加更詳細的描述或筆記。這對理解複雜概念很有幫助。',
          title: '5. (可選) 添加詳細信息',
          isOptional: true, // Joyride doesn't have a built-in 'isOptional' visual, but good for our logic
        },
        {
          target: 'body',
          content: '太棒了！您已經掌握了添加節點並編輯其基本信息的方法。繼續探索，嘗試創建更多節點和它們之間的聯繫吧！',
          placement: 'center',
          title: '教程完成！',
        }
      ];
    }
    // Add other tutorial definitions above this line
    else if (key === 'manualCreateEdgeTutorial') {
      return [
        {
          target: '.react-flow__pane',
          content: '現在我們來學習如何手動連接兩個節點以創建一條邊。請確保您的畫布上至少有兩個節點。',
          placement: 'center',
          title: '手動創建邊',
          disableBeacon: true,
        },
        {
          target: '.react-flow__node:nth-of-type(1) .react-flow__handle', // Targets a handle of the first node, adjust if too generic
          content: '將鼠標懸停在一個節點上，您會看到邊緣出現一些小的連接樁 (Handle)。點擊並按住其中一個 Handle 開始拖拽。',
          title: '1. 開始拖拽連接線',
          spotlightClicks: true, // Allows interaction with handles
        },
        {
          target: '.react-flow__node:nth-of-type(2) .react-flow__handle', // Targets a handle of a second node
          content: '將連接線拖拽到另一個節點的任意 Handle 上，然後鬆開鼠標按鈕。',
          title: '2. 連接到目標節點',
          spotlightClicks: true,
        },
        {
          target: dynamicEdgeId ? `.react-flow__edge[id='${dynamicEdgeId}']` : '.react-flow__pane',
          content: dynamicEdgeId
            ? '太棒了！您已經成功創建了一條連接線（邊），它已被高亮顯示。'
            : '一條新的連接線（邊）已經被創建。',
          title: '3. 邊已創建',
          spotlightClicks: true, // Allow clicking the new edge
        },
        {
          target: "#tutorial-target-toggle-properties-button",
          content: '現在，請點擊選中剛剛創建的邊（如果它還沒有被選中）。然後，如果屬性面板未打開，請點擊此按鈕打開它。',
          title: '4. 選中邊並打開屬性面板',
        },
        {
          target: "input[data-tutorial-id='properties-inspector-edge-label-input']",
          content: '在屬性面板中，您可以為這條邊輸入一個描述性的標籤，例如「導致」、「屬於」或「相關於」。',
          title: '5. 編輯邊的標籤',
        },
        {
          target: 'body',
          content: '非常好！您現在知道如何創建邊並為其添加標籤了。',
          placement: 'center',
          title: '教程完成！',
        }
      ];
    } else if (key === 'suggestRelationsToolTutorial') {
      return [
        {
          target: '.react-flow__pane',
          content: '現在來學習如何使用 AI 根據您地圖中的現有概念建議它們之間的潛在關係。',
          placement: 'center',
          title: 'AI工具：建議關係',
          disableBeacon: true,
        },
        {
          target: "button[aria-label='AI Tools']", // Or specific node context menu trigger if applicable
          content: '首先，打開AI工具菜單。您通常可以在編輯器工具欄找到它。如果選中了一個節點，也可以在節點的右鍵菜單中找到相關AI選項。',
          title: '1. 打開AI菜單',
        },
        {
          target: "button[data-tutorial-id='ai-tool-suggest-relations']", // Ensure this ID exists on the menu item
          content: '從菜單中選擇「建議關係」。',
          title: '2. 選擇建議關係工具',
        },
        {
          target: "[role='dialog'][aria-labelledby='suggest-relations-title']", // Adjust if modal has different aria label
          content: 'AI會自動分析您圖譜中的概念（或者您選中的概念及其鄰近概念）來提出關係建議。您可以直接點擊「建議」按鈕。',
          title: '3. 確認建議',
          placement: 'auto',
        },
        {
          target: "button[type='submit'][data-tutorial-id='suggest-relations-submit']",
          content: '點擊此按鈕開始分析並獲取建議。',
          title: '開始建議',
        },
        {
          target: "button[data-tutorial-id='editor-toggle-ai-panel']",
          content: '建議生成後，會顯示在AI建議面板中。如果面板未打開，請點擊此按鈕查看。',
          title: '4. 查看建議的關係',
        },
        {
          target: ".ai-suggestion-panel .suggestion-type-relation", // Placeholder - needs specific selector for relation items
          content: '在建議面板中，您會看到AI建議的關係列表，通常包含源概念、目標概念和它們之間的關係標籤。您可以選擇接受這些建議，將它們作為新的邊添加到您的圖中。',
          title: 'AI建議面板中的關係',
          placement: 'left',
        },
        {
          target: 'body',
          content: '非常好！現在您知道如何利用AI來發現和建立概念之間的新聯繫了。',
          placement: 'center',
          title: '教程完成！',
        },
      ];
    }


    return []; // Default to no steps
  }, [user]);

  useEffect(() => {
    if (user && !loading && activeTutorialKey) {
      const tutorialHasBeenSeen = localStorage.getItem(activeTutorialKey) === 'true';
      // Pass both dynamic IDs to getStepsForTutorial
      const newSteps = getStepsForTutorial(activeTutorialKey, tutorialTempTargetNodeId, tutorialTempTargetEdgeId);

      if (runTutorial) {
        if (!tutorialHasBeenSeen || steps.length === 0 ||
            (activeTutorialKey === 'manualAddNodeTutorial' && tutorialTempTargetNodeId) ||
            (activeTutorialKey === 'manualCreateEdgeTutorial' && tutorialTempTargetEdgeId)
        ) {
          setSteps(newSteps);
        }
      } else {
        if (steps.length > 0) setSteps([]);
      }
    } else if ((!user && !loading) || !activeTutorialKey) {
        if(runTutorial) setRunTutorialState(false);
        if (steps.length > 0) setSteps([]);
    }
  }, [
    user, loading, runTutorial, activeTutorialKey,
    setRunTutorialState, tutorialTempTargetNodeId, tutorialTempTargetEdgeId, // Added edgeId
    getStepsForTutorial, steps.length
  ]);


  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, lifecycle, index, action, step } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)) {
        setStepIndex(index + (action === 'prev' ? -1 : 1));
    }

    if (finishedStatuses.includes(status) || (type === EVENTS.TOOLTIP_CLOSE && action === 'close')) {
      setRunTutorialState(false);
      if (activeTutorialKey === 'manualAddNodeTutorial') {
        clearTutorialTempTargetNodeId(null);
      }
      if (activeTutorialKey === 'manualCreateEdgeTutorial') { // Clear edge ID for its tutorial
        clearTutorialTempTargetEdgeId(null);
      }
    } else if (type === EVENTS.STEP_AFTER && activeTutorialKey === 'manualAddNodeTutorial' && step.title === '2. 新節點已添加') {
      // Logic for specific step handling if needed
    } else if (type === EVENTS.STEP_AFTER && activeTutorialKey === 'manualCreateEdgeTutorial' && step.title === '3. 邊已創建') {
      // Logic for specific step handling if needed
    }
  };

  if (loading || !user || steps.length === 0 || !runTutorial || !activeTutorialKey) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={runTutorial} // Use runTutorial from store
      stepIndex={currentStepIndex} // Control step index from store
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: '上一步',
        close: '關閉',
        last: '完成',
        next: '下一步',
        skip: '跳過',
      }}
      styles={{
        options: {
          zIndex: 10000, // Keep high z-index
          arrowColor: 'hsl(var(--card-values))',
          backgroundColor: 'hsl(var(--card-values))',
          primaryColor: 'hsl(var(--primary-values))',
          textColor: 'hsl(var(--card-foreground-values))',
          overlayColor: `hsla(var(--background-values), 0.7)`,
        },
        tooltip: {
          borderRadius: 'var(--radius)',
          padding: '1rem',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid hsl(var(--border-values))',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          margin: 0,
          fontSize: '1.125rem',
          fontWeight: '600',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid hsl(var(--border-values))',
          marginBottom: '0.75rem',
        },
        tooltipContent: {
          fontSize: '0.875rem',
          lineHeight: '1.4',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary-values))',
          color: 'hsl(var(--primary-foreground-values))',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          textTransform: 'none',
        },
        buttonBack: {
          backgroundColor: 'hsl(var(--secondary-values))',
          color: 'hsl(var(--secondary-foreground-values))',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          marginRight: '0.5rem',
          textTransform: 'none',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground-values))',
          fontSize: '0.8rem',
          textTransform: 'none',
        },
        buttonClose: {
            top: '10px',
            right: '10px',
            height: '1rem',
            width: '1rem',
            color: 'hsl(var(--muted-foreground-values))',
        },
        beacon: {
            outlineColor: 'hsl(var(--primary-values))',
            backgroundColor: 'hsl(var(--primary-values))',
        },
        overlay: {
            // already handled by overlayColor in options
        },
        spotlight: { // Styles for the highlighted area
            borderRadius: 'var(--radius-sm)', // make spotlight have slight rounded corners
        }
      }}
      // debug
    />
  );
};

export default AppTutorial;
        close: '關閉',
        last: '完成',
        next: '下一步',
        skip: '跳過',
      }}
      styles={{
        options: {
          zIndex: 10000, // Keep high z-index
          arrowColor: 'hsl(var(--card))', // Arrow color matches card background for seamless look
          backgroundColor: 'hsl(var(--card))', // Use card background color
          primaryColor: 'hsl(var(--primary))', // Use primary color from CSS variables
          textColor: 'hsl(var(--card-foreground))', // Use card foreground color
          overlayColor: 'hsla(var(--background-hsl), 0.7)', // Use background color with opacity for overlay
        },
        tooltip: { // Styles for the main tooltip box
          borderRadius: 'var(--radius)', // Use CSS variable for radius, e.g., 0.5rem
          padding: '1rem', // Standard padding
          boxShadow: 'var(--shadow-lg)', // Use a standard shadow
          border: '1px solid hsl(var(--border))',
        },
        tooltipContainer: { // Styles for the container of the tooltip (rarely needed)
          textAlign: 'left',
        },
        tooltipTitle: { // Styles for the title
          margin: 0,
          fontSize: '1.125rem', // Tailwind text-lg
          fontWeight: '600', // Tailwind semibold
          paddingBottom: '0.5rem',
          borderBottom: '1px solid hsl(var(--border))', // Separator
          marginBottom: '0.75rem',
        },
        tooltipContent: { // Styles for the content text
          fontSize: '0.875rem', // Tailwind text-sm
          lineHeight: '1.4',
        },
        buttonNext: { // Styles for the Next button
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 'var(--radius-sm)', // Slightly smaller radius for buttons inside
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          textTransform: 'none',
        },
        buttonBack: { // Styles for the Back button
          backgroundColor: 'hsl(var(--secondary))',
          color: 'hsl(var(--secondary-foreground))',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          marginRight: '0.5rem',
          textTransform: 'none',
        },
        buttonSkip: { // Styles for the Skip button
          color: 'hsl(var(--muted-foreground))',
          fontSize: '0.8rem',
          textTransform: 'none',
        },
        buttonClose: { // Styles for the X close button on the tooltip
            top: '10px', // Adjust position as needed
            right: '10px',
            height: '1rem', // lucide icon size
            width: '1rem', // lucide icon size
            color: 'hsl(var(--muted-foreground))',
        },
        beacon: { // Styles for the pulsing beacon before a step
            outlineColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary))',
        },
        overlay: { // Styles for the dark overlay
            // already handled by overlayColor in options
        },
        spotlight: { // Styles for the highlighted area
            borderRadius: 'var(--radius-sm)', // make spotlight have slight rounded corners
        }
      }}
      // debug
    />
  );
};

export default AppTutorial;

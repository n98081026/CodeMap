import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/auth-context';

import useTutorialStore from '@/stores/tutorial-store'; // Import the tutorial store

interface AppTutorialProps {
  // run, setRun and tutorialKey will now be primarily managed by/obtained from the store
}

const AppTutorial: React.FC<AppTutorialProps> = () => {
  const { user, loading } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);

  const {
    activeTutorialKey,
    runTutorial,
    currentStepIndex,
    setRunTutorialState,
    setStepIndex
  } = useTutorialStore(
    useCallback(s => ({
      activeTutorialKey: s.activeTutorialKey,
      runTutorial: s.runTutorial,
      currentStepIndex: s.currentStepIndex,
      setRunTutorialState: s.setRunTutorialState,
      setStepIndex: s.setStepIndex,
    }), [])
  );

  // Define specific steps for different tutorials
  const getStepsForTutorial = (key: string): Step[] => {
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
          // Temporarily target the pane. Later, we'll try to target the new node.
          target: '.react-flow__pane',
          content: '太棒了！一個新的「概念」節點已經出現在畫布上。您可以拖動它來改變位置。',
          title: '2. 新節點已添加',
          // event: 'click', // Consider if an event is needed or if it's just informational
        },
        {
          target: "#tutorial-target-toggle-properties-button",
          content: '選中新節點後 (如果它尚未被選中，請單擊它)，您可以點擊此按鈕打開屬性面板，然後編輯它的文本和詳細信息。',
          title: '3. 編輯節點內容',
        },
      ];
    }


    return []; // Default to no steps
  };

  useEffect(() => {
    if (user && !loading && activeTutorialKey) { // Depend on activeTutorialKey from store
      const tutorialHasBeenSeen = localStorage.getItem(activeTutorialKey) === 'true';
      if (runTutorial && !tutorialHasBeenSeen) {
        setSteps(getStepsForTutorial(activeTutorialKey));
      } else if (tutorialHasBeenSeen && runTutorial) { // If seen but run is true (e.g. forced restart)
         setSteps(getStepsForTutorial(activeTutorialKey));
      } else if (tutorialHasBeenSeen && !runTutorial) { // If seen and run is false
        // This case is handled by the store now mostly
      }
    } else if ((!user && !loading) || !activeTutorialKey) {
        if(runTutorial) setRunTutorialState(false); // Ensure it's off if no user or key
        setSteps([]);
    }
  }, [user, loading, runTutorial, activeTutorialKey, setRunTutorialState]); // Updated dependencies


  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, lifecycle, index, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)) {
        // Update step index in store
        setStepIndex(index + (action === 'prev' ? -1 : 1));
    }


    if (finishedStatuses.includes(status)) {
      setRunTutorialState(false); // This will also update localStorage via the store's logic
      // console.log(`${activeTutorialKey} completed or skipped.`);
    } else if (type === EVENTS.TOOLTIP_CLOSE && lifecycle === 'complete') {
      // This might indicate user closed a non-continuous step, or a step in a flow
      // The store's setStepIndex and setRunTutorialState should handle most completion/skip logic.
    }
     // console.log(`Joyride (${activeTutorialKey}) callback data:`, data);
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

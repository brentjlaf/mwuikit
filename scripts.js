(async function () {
      try {
      const response = await fetch('./data.json');
      if (!response.ok) {
        throw new Error(`Failed to load data.json: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      const DEFAULT_AUTHOR_COLOR = data.defaultAuthorColor ?? 'slate';
      const AUTHOR_DETAILS = data.authorDetails ?? {};
      const STATUS_OPTIONS = Array.isArray(data.statusOptions) ? data.statusOptions : [];
      const STATUS_DESCRIPTIONS = data.statusDescriptions ?? {};
      const TYPE_STYLES = data.typeStyles ?? {};
      const TEMPLATE_DEFAULTS_BY_TYPE = data.templateDefaultsByType ?? {};
      const REPORT_CARD_OPTIONS = Array.isArray(data.reportCardOptions)
          ? data.reportCardOptions
          : [];

      const folderStateStorageKey = 'mw-pages-folder-state';
      const flatViewStorageKey = 'mw-pages-flat-view';
      const state = {
          status: 'all',
          search: '',
          searchRaw: '',
          authors: new Set(),
          types: new Set(),
          statuses: new Set(),
          reportCards: new Set(),
          dateStart: '',
          dateEnd: '',
          sortKey: 'modified',
          sortDirection: 'desc',
        };

      
      const dateFormatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });

      function getAuthorInitials(name) {
        if (!name) {
          return '';
        }
        const initials = name
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('');
        if (initials) {
          return initials;
        }
        const firstChar = name.trim()[0];
        return firstChar ? firstChar.toUpperCase() : '';
      }

      function getStatusLabel(value) {
        const match = STATUS_OPTIONS.find((option) => option.value === value);
        return match ? match.label : value;
      }

      function getReportLabel(value) {
        const match = REPORT_CARD_OPTIONS.find((option) => option.value === value);
        return match ? match.label : value;
      }

      function formatDateForDisplay(value) {
        if (!value) {
          return '';
        }
        const [year, month, day] = value.split('-');
        if (!year || !month || !day) {
          return value;
        }
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (Number.isNaN(date.getTime())) {
          return value;
        }
        return dateFormatter.format(date);
      }

      function updateActiveFilterSummary(count) {
        if (!activeFilterCount) {
          return;
        }
        if (count === 0) {
          activeFilterCount.textContent = 'No filters applied';
        } else if (count === 1) {
          activeFilterCount.textContent = '1 filter applied';
        } else {
          activeFilterCount.textContent = `${count} filters applied`;
        }
      }

      const selection = new Set();

      const searchInput = document.getElementById('pagesSearch');
      const filterChips = document.getElementById('filterChips');
      const tabButtons = document.querySelectorAll('[data-status-tab]');
      const countBadges = document.querySelectorAll('[data-status-count]');
      const filtersButton = document.getElementById('filtersButton');
      const filtersDrawer = document.getElementById('filtersDrawer');
      const drawerCloseButton = filtersDrawer?.querySelector('.drawer-close');
      const authorFilterList = document.getElementById('authorFilterList');
      const statusFilterPills = document.getElementById('statusFilterPills');
      const typeFilterList = document.getElementById('typeFilterList');
      const reportFilterList = document.getElementById('reportFilterList');
      const clearFiltersButton = document.getElementById('clearFiltersButton');
      const applyFiltersButton = document.getElementById('applyFiltersButton');
      const startDateInput = document.getElementById('filterStartDate');
      const endDateInput = document.getElementById('filterEndDate');
      const activeFilterCount = document.getElementById('activeFilterCount');
      const searchOverlay = document.querySelector('.search-overlay');
      const newButton = document.getElementById('newButton');
      const dialog = document.getElementById('newDialog');
      const dialogCloseButton = dialog?.querySelector('.dialog-close');
      const optionButtons = dialog ? dialog.querySelectorAll('.dialog-option') : [];
      const newPageDialog = document.getElementById('newPageDialog');
      const newPageDialogCloseButton = newPageDialog?.querySelector('.dialog-close');
      const newPageForm = document.getElementById('newPageForm');
      const newPageTitleInput = document.getElementById('newPageTitle');
      const newPageSteps = newPageForm
        ? Array.from(newPageForm.querySelectorAll('[data-step]'))
        : [];
      const newPageStepTabs = newPageForm
        ? Array.from(newPageForm.querySelectorAll('[data-step-tab]'))
        : [];
      const newPageNextButton = newPageForm?.querySelector('[data-new-page-nav="next"]') || null;
      const newPageSubmitButton = newPageForm?.querySelector('[data-new-page-nav="submit"]') || null;
      const newPageCancelButton =
        newPageForm?.querySelector('[data-new-page-action="cancel"]') || null;
      const newPageSlugInput = document.getElementById('newPageSlug');
      const newPageMetaTitleInput = document.getElementById('newPageMetaTitle');
      const newPageMetaDescriptionInput = document.getElementById('newPageMetaDescription');
      const newPageTypeButtons = newPageForm
        ? Array.from(newPageForm.querySelectorAll('[data-new-page-type-option]'))
        : [];
      const newPageTemplateButtons = newPageForm
        ? Array.from(newPageForm.querySelectorAll('[data-new-page-template-option]'))
        : [];
      const newPageTypeInput = document.getElementById('newPageTypeInput');
      const newPageTemplateInput = document.getElementById('newPageTemplateInput');
      let defaultNewPageTypeValue = '';
      let defaultNewPageTemplateValue = '';
      let activeNewPageTemplateIndex = -1;
      const copyPageDialog = document.getElementById('copyPageDialog');
      const copyPageDialogClose = copyPageDialog?.querySelector('.dialog-close');
      const copyPageForm = document.getElementById('copyPageForm');
      const copyPageNameInput = document.getElementById('copyPageNameInput');
      const copyPageSourceName = document.getElementById('copyPageSourceName');
      const copyPageCancelButton = copyPageDialog?.querySelector('[data-copy-dialog-action="cancel"]');
      let newPageCurrentStepIndex = 0;
      const masterCheckbox = document.getElementById('masterCheckbox');
      const bulkBar = document.getElementById('bulkActionsBar');
      const selectionCount = document.getElementById('selectionCount');
      const clearSelectionButton = document.getElementById('clearSelectionButton');
      const bulkActionButtons = document.querySelectorAll('[data-bulk-action]');
      const sortButtons = document.querySelectorAll('.sort-button');

      const folderSettingsDialog = document.getElementById('folderSettingsDialog');
      const folderDialogClose = folderSettingsDialog?.querySelector('.dialog-close');
      const folderSettingsForm = document.getElementById('folderSettingsForm');
      const folderDialogTitle = document.getElementById('folderDialogTitle');
      const folderDialogSubmitButton = folderSettingsForm?.querySelector('button[type="submit"]');
      const folderNameInput = document.getElementById('folderNameInput');
      const folderColorRadios = folderSettingsForm
        ? folderSettingsForm.querySelectorAll('input[name="folderColor"]')
        : [];
      const folderDialogCancel = folderSettingsDialog?.querySelector('[data-folder-dialog-action="cancel"]');

      const moveFolderDialog = document.getElementById('moveFolderDialog');
      const moveFolderDialogPanel = moveFolderDialog?.querySelector('.dialog');
      const moveFolderForm = document.getElementById('moveFolderForm');
      const moveFolderDestinationSelect = document.getElementById('moveFolderDestination');
      const moveFolderSubmitButton = moveFolderForm?.querySelector('[data-folder-dialog-primary]');

      const deleteFolderDialog = document.getElementById('deleteFolderDialog');
      const deleteFolderDialogPanel = deleteFolderDialog?.querySelector('.dialog');
      const deleteFolderForm = document.getElementById('deleteFolderForm');
      const deleteFolderConfirmInput = document.getElementById('deleteFolderConfirmInput');

      const restoreAllDialog = document.getElementById('restoreAllDialog');
      const restoreAllDialogPanel = restoreAllDialog?.querySelector('.dialog');
      const restoreAllForm = document.getElementById('restoreAllForm');

      const emptyTrashDialog = document.getElementById('emptyTrashDialog');
      const emptyTrashDialogPanel = emptyTrashDialog?.querySelector('.dialog');
      const emptyTrashForm = document.getElementById('emptyTrashForm');
      const emptyTrashConfirmInput = document.getElementById('emptyTrashConfirmInput');

      const pageSettingsDialog = document.getElementById('pageSettingsDialog');
      const pageSettingsDialogTitle = document.getElementById('pageSettingsDialogTitle');
      const pageSettingsDialogSubtitle = document.getElementById('pageSettingsDialogSubtitle');
      const pageSettingsDialogClose = pageSettingsDialog?.querySelector('.dialog-close');
      const pageSettingsCancel = pageSettingsDialog?.querySelector('[data-page-settings-action="cancel"]');
      const pageSettingsForm = document.getElementById('pageSettingsForm');
      const pageSettingsIdInput = document.getElementById('pageSettingsIdInput');
      const pageSettingsTitleInput = document.getElementById('pageSettingsTitleInput');
      const pageSettingsSlugInput = document.getElementById('pageSettingsSlugInput');
      const pageSettingsHomeToggle = document.getElementById('pageSettingsHomeToggle');
      const pageSettingsPrivacySelect = document.getElementById('pageSettingsPrivacy');
      const pageSettingsRequireLoginCheckbox = document.getElementById('pageSettingsRequireLogin');
      const pageSettingsComplexUrlCheckbox = document.getElementById('pageSettingsComplexUrl');
      const pageSettingsHideSearchCheckbox = document.getElementById('pageSettingsHideSearch');
      const pageSettingsHideSiteSearchCheckbox = document.getElementById('pageSettingsHideSiteSearch');
      const pageSettingsCanonicalInput = document.getElementById('pageSettingsCanonical');
      const pageSettingsMetaTitleInput = document.getElementById('pageSettingsMetaTitle');
      const pageSettingsMetaDescriptionInput = document.getElementById('pageSettingsMetaDescription');
      const pageSettingsOgTitleInput = document.getElementById('pageSettingsOgTitle');
      const pageSettingsOgDescriptionInput = document.getElementById('pageSettingsOgDescription');
      const pageSettingsOgImageInput = document.getElementById('pageSettingsOgImage');
      const pageSettingsTypeInput = document.getElementById('pageSettingsTypeInput');
      const pageSettingsTemplateInput = document.getElementById('pageSettingsTemplateInput');

      const publishDialog = document.getElementById('publishConfirmDialog');
      const publishDialogPanel = publishDialog?.querySelector('.dialog');
      const publishDialogForm = publishDialog?.querySelector('[data-publish-dialog-form]');
      const publishStatusLabel = publishDialog?.querySelector('[data-publish-current-status]');

      const unpublishDialog = document.getElementById('unpublishConfirmDialog');
      const unpublishDialogPanel = unpublishDialog?.querySelector('.dialog');
      const unpublishDialogForm = unpublishDialog?.querySelector('[data-unpublish-dialog-form]');
      const unpublishReasonSelect = unpublishDialog?.querySelector('#unpublishReason');
      const unpublishNoteInput = unpublishDialog?.querySelector('#unpublishNote');

      const scheduleDialog = document.getElementById('scheduleDialog');
      const scheduleDialogPanel = scheduleDialog?.querySelector('.dialog');
      const scheduleDialogForm = scheduleDialog?.querySelector('[data-schedule-dialog-form]');
      const scheduleDateInput = scheduleDialog?.querySelector('#scheduleDateInput');
      const scheduleTimeInput = scheduleDialog?.querySelector('#scheduleTimeInput');
      const scheduleTimezoneSelect = scheduleDialog?.querySelector('#scheduleTimezoneSelect');
      const scheduleNotifyCheckbox = scheduleDialog?.querySelector('#scheduleNotifyTeam');

      const moveDialog = document.getElementById('movePageDialog');
      const moveDialogPanel = moveDialog?.querySelector('.dialog');
      const moveDialogForm = moveDialog?.querySelector('[data-move-dialog-form]');
      const moveDialogOptions = moveDialog?.querySelector('[data-move-dialog-options]');

      const trashDialog = document.getElementById('trashConfirmDialog');
      const trashDialogPanel = trashDialog?.querySelector('.dialog');
      const trashDialogForm = trashDialog?.querySelector('[data-trash-dialog-form]');
      const trashNoteInput = trashDialog?.querySelector('#trashReason');

      const restoreDialog = document.getElementById('restoreConfirmDialog');
      const restoreDialogPanel = restoreDialog?.querySelector('.dialog');
      const restoreDialogForm = restoreDialog?.querySelector('[data-restore-dialog-form]');
      const restorePublishCheckbox = restoreDialog?.querySelector('#restorePublishToggle');

      const deleteDialog = document.getElementById('deleteConfirmDialog');
      const deleteDialogPanel = deleteDialog?.querySelector('.dialog');
      const deleteDialogForm = deleteDialog?.querySelector('[data-delete-dialog-form]');
      const deleteAcknowledgeCheckbox = deleteDialog?.querySelector('#deleteAcknowledge');
      const pageSettingsTabButtons = pageSettingsDialog
        ? Array.from(pageSettingsDialog.querySelectorAll('[data-page-settings-tab]'))
        : [];
      const pageSettingsPanels = pageSettingsDialog
        ? Array.from(pageSettingsDialog.querySelectorAll('[data-page-settings-panel]'))
        : [];
      const defaultPageSettingsTab =
        pageSettingsTabButtons[0]?.dataset.pageSettingsTab || null;
      let activePageSettingsTab = defaultPageSettingsTab;
      const pageSettingsTypeButtons = pageSettingsDialog
        ? Array.from(pageSettingsDialog.querySelectorAll('[data-page-type-option]'))
        : [];
      const pageSettingsTemplateButtons = pageSettingsDialog
        ? Array.from(pageSettingsDialog.querySelectorAll('[data-page-template-option]'))
        : [];
      const defaultPageTypeValue =
        pageSettingsTypeButtons[0]?.dataset.pageTypeOption || '';
      const defaultPageTemplateValue =
        pageSettingsTemplateButtons[0]?.dataset.pageTemplateOption || '';

      defaultNewPageTypeValue =
        newPageTypeInput?.value ||
        newPageTypeButtons[0]?.dataset.newPageTypeOption ||
        defaultPageTypeValue ||
        '';
      defaultNewPageTemplateValue =
        newPageTemplateInput?.value ||
        (newPageTemplateButtons.find(
          (button) => button.dataset.templateType === defaultNewPageTypeValue
        )?.dataset.newPageTemplateOption || '') ||
        (defaultPageTemplateValue &&
        newPageTemplateButtons.some(
          (button) => button.dataset.newPageTemplateOption === defaultPageTemplateValue
        )
          ? defaultPageTemplateValue
          : '') ||
        newPageTemplateButtons[0]?.dataset.newPageTemplateOption ||
        '';
      activeNewPageTemplateIndex = newPageTemplateButtons.findIndex((button) => {
        const ariaPressed = button.getAttribute('aria-pressed');
        return button.dataset.selected === 'true' || ariaPressed === 'true';
      });

      function setActivePageSettingsTab(tabValue, { focusTab = false } = {}) {
        if (!pageSettingsTabButtons.length || !pageSettingsPanels.length) {
          return;
        }

        const targetValue =
          pageSettingsTabButtons.find(
            (button) => button.dataset.pageSettingsTab === tabValue
          )?.dataset.pageSettingsTab || defaultPageSettingsTab;

        if (!targetValue) {
          return;
        }

        activePageSettingsTab = targetValue;

        pageSettingsTabButtons.forEach((button) => {
          const isActive = button.dataset.pageSettingsTab === targetValue;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-selected', isActive ? 'true' : 'false');
          button.tabIndex = isActive ? 0 : -1;
          if (isActive && focusTab) {
            button.focus({ preventScroll: true });
          }
        });

        pageSettingsPanels.forEach((panel) => {
          const isActive = panel.dataset.pageSettingsPanel === targetValue;
          panel.hidden = !isActive;
          panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
      }

      function focusAdjacentPageSettingsTab(direction) {
        if (!pageSettingsTabButtons.length) {
          return;
        }
        const currentIndex = pageSettingsTabButtons.findIndex(
          (button) => button.dataset.pageSettingsTab === activePageSettingsTab
        );
        const startIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex =
          (startIndex + direction + pageSettingsTabButtons.length) %
          pageSettingsTabButtons.length;
        const nextTab = pageSettingsTabButtons[nextIndex]?.dataset.pageSettingsTab;
        if (nextTab) {
          setActivePageSettingsTab(nextTab, { focusTab: true });
        }
      }

      function setPageSettingsType(value) {
        const buttons = pageSettingsTypeButtons;
        if (!buttons.length) {
          if (pageSettingsTypeInput) {
            pageSettingsTypeInput.value = value || '';
          }
          return;
        }
        const availableValues = buttons
          .map((button) => button.dataset.pageTypeOption || '')
          .filter(Boolean);
        const target =
          (value && availableValues.includes(value) && value) ||
          defaultPageTypeValue ||
          availableValues[0] ||
          '';
        if (pageSettingsTypeInput) {
          pageSettingsTypeInput.value = target;
        }
        buttons.forEach((button) => {
          const buttonValue = button.dataset.pageTypeOption || '';
          const isSelected = Boolean(target) && buttonValue === target;
          button.dataset.selected = isSelected ? 'true' : 'false';
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
      }

      function setPageSettingsTemplate(value) {
        const buttons = pageSettingsTemplateButtons;
        if (!buttons.length) {
          if (pageSettingsTemplateInput) {
            pageSettingsTemplateInput.value = value || '';
          }
          return;
        }
        const availableValues = buttons
          .map((button) => button.dataset.pageTemplateOption || '')
          .filter(Boolean);
        const target =
          (value && availableValues.includes(value) && value) ||
          defaultPageTemplateValue ||
          availableValues[0] ||
          '';
        if (pageSettingsTemplateInput) {
          pageSettingsTemplateInput.value = target;
        }
        buttons.forEach((button) => {
          const buttonValue = button.dataset.pageTemplateOption || '';
          const isSelected = Boolean(target) && buttonValue === target;
          button.dataset.selected = isSelected ? 'true' : 'false';
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
      }

      const pageRows = Array.from(document.querySelectorAll('.page-row'));
      const folderRows = Array.from(document.querySelectorAll('.group-row'));
      const folderToggleButtons = Array.from(document.querySelectorAll('[data-folder-toggle]'));
      const folderCheckboxes = Array.from(document.querySelectorAll('[data-folder-checkbox]'));
      const folderViewToggleButton = document.querySelector('[data-folder-toggle-all]');
      const folderViewToggleIcon =
        folderViewToggleButton?.querySelector('[data-folder-view-icon]') || null;
      const flatViewToggleButton = document.querySelector('[data-flat-view-toggle]');
      const flatViewToggleIcon = flatViewToggleButton?.querySelector('[data-flat-view-icon]') || null;
      const actionMenus = Array.from(document.querySelectorAll('[data-action-menu]'));
      const copyPageButtons = Array.from(document.querySelectorAll('[data-copy-page]'));

      const pageRowById = new Map(pageRows.map((row) => [row.dataset.pageId, row]));
      const folderRowById = new Map(folderRows.map((row) => [row.dataset.folder, row]));

      const folderMembers = new Map();
      pageRows.forEach((row) => {
        const folderId = row.dataset.folder || '_root';
        if (!folderMembers.has(folderId)) {
          folderMembers.set(folderId, []);
        }
        if (!row.dataset.template) {
          const fallbackTemplate =
            TEMPLATE_DEFAULTS_BY_TYPE[row.dataset.type || ''] ||
            defaultPageTemplateValue;
          if (fallbackTemplate) {
            row.dataset.template = fallbackTemplate;
          }
        }
        folderMembers.get(folderId).push(row);
      });

      const folderOptions = [{ value: '_root', label: 'No folder' }];
      const seenFolders = new Set(['_root']);
      folderRows.forEach((row) => {
        const folderId = row.dataset.folder || '';
        if (!folderId || seenFolders.has(folderId)) {
          return;
        }
        const label = row.dataset.folderName || folderId;
        folderOptions.push({ value: folderId, label });
        seenFolders.add(folderId);
      });

      const actionDialogControllers = [];
      const actionDialogs = {};
      const folderActionDialogs = {};

      const publishDialogController = createActionDialog({
        name: 'publish',
        backdrop: publishDialog,
        dialog: publishDialogPanel,
        form: publishDialogForm,
        initialFocusSelector: '#publishVisibility',
        onOpen: ({ row }) => {
          if (publishStatusLabel) {
            const statusValue = row?.dataset.status || '';
            const statusLabel = statusValue ? getStatusLabel(statusValue) : '—';
            publishStatusLabel.textContent = statusLabel || '—';
          }
        },
        onClose: () => {
          if (publishStatusLabel) {
            publishStatusLabel.textContent = '—';
          }
        },
        onSubmit: ({ pageId, form }) => {
          const formData = new FormData(form);
          const visibility = (formData.get('publishVisibility') || 'public').toString();
          const notify = formData.has('publishNotifySubscribers');
          console.log('Publish page', {
            pageId,
            visibility,
            notifySubscribers: notify,
          });
        },
      });

      if (publishDialogController) {
        actionDialogControllers.push(publishDialogController);
        actionDialogs.publish = publishDialogController;
      }

      const unpublishDialogController = createActionDialog({
        name: 'unpublish',
        backdrop: unpublishDialog,
        dialog: unpublishDialogPanel,
        form: unpublishDialogForm,
        initialFocusSelector: '#unpublishReason',
        onOpen: () => {
          if (unpublishReasonSelect instanceof HTMLSelectElement && unpublishReasonSelect.options.length > 0) {
            unpublishReasonSelect.value = unpublishReasonSelect.options[0].value;
          }
          if (unpublishNoteInput instanceof HTMLTextAreaElement) {
            unpublishNoteInput.value = '';
          }
        },
        onSubmit: ({ pageId, form }) => {
          const formData = new FormData(form);
          const reason = (formData.get('unpublishReason') || '').toString();
          const note = (formData.get('unpublishNote') || '').toString().trim();
          console.log('Unpublish page', {
            pageId,
            reason,
            note: note || null,
          });
        },
      });

      if (unpublishDialogController) {
        actionDialogControllers.push(unpublishDialogController);
        actionDialogs.unpublish = unpublishDialogController;
      }

      const scheduleDialogController = createActionDialog({
        name: 'schedule',
        backdrop: scheduleDialog,
        dialog: scheduleDialogPanel,
        form: scheduleDialogForm,
        initialFocusSelector: '#scheduleDateInput',
        onOpen: () => {
          const now = new Date();
          if (scheduleDateInput instanceof HTMLInputElement) {
            const today = formatDateInputValue(now);
            scheduleDateInput.min = today;
            scheduleDateInput.value = today;
          }
          if (scheduleTimeInput instanceof HTMLInputElement) {
            scheduleTimeInput.value = formatTimeInputValue(now);
          }
          if (scheduleTimezoneSelect instanceof HTMLSelectElement) {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            if (scheduleTimezoneSelect.querySelector(`option[value="${timezone}"]`)) {
              scheduleTimezoneSelect.value = timezone;
            } else {
              scheduleTimezoneSelect.value = 'UTC';
            }
          }
          if (scheduleNotifyCheckbox instanceof HTMLInputElement) {
            scheduleNotifyCheckbox.checked = true;
          }
        },
        onSubmit: ({ pageId, form }) => {
          const formData = new FormData(form);
          const date = (formData.get('scheduleDate') || '').toString();
          const time = (formData.get('scheduleTime') || '').toString();
          const timezone = (formData.get('scheduleTimezone') || '').toString();
          const notify = formData.has('scheduleNotifyTeam');
          console.log('Schedule page', {
            pageId,
            schedule: { date, time, timezone },
            notifyOwner: notify,
          });
        },
      });

      if (scheduleDialogController) {
        actionDialogControllers.push(scheduleDialogController);
        actionDialogs.schedule = scheduleDialogController;
      }

      const moveDialogController = createActionDialog({
        name: 'move',
        backdrop: moveDialog,
        dialog: moveDialogPanel,
        form: moveDialogForm,
        initialFocusSelector: 'input[name="moveFolder"]',
        onOpen: ({ row }) => {
          if (!(moveDialogOptions instanceof HTMLElement)) {
            return;
          }
          moveDialogOptions.innerHTML = '';
          const currentFolder = row?.dataset.folder || '_root';
          folderOptions.forEach(({ value, label }) => {
            const optionLabel = label || (value === '_root' ? 'No folder' : value);
            const wrapper = document.createElement('label');
            wrapper.className = 'action-dialog-radio';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'moveFolder';
            radio.value = value;
            radio.required = true;
            radio.checked = value === currentFolder;
            const text = document.createElement('div');
            text.className = 'action-dialog-radio-text';
            const title = document.createElement('strong');
            title.textContent = optionLabel;
            const subtitle = document.createElement('span');
            subtitle.textContent =
              value === currentFolder ? 'Currently assigned' : 'Move page to this folder';
            text.append(title, subtitle);
            wrapper.append(radio, text);
            moveDialogOptions.append(wrapper);
          });
        },
        onClose: () => {
          if (moveDialogOptions instanceof HTMLElement) {
            moveDialogOptions.innerHTML = '';
          }
        },
        onSubmit: ({ pageId, form }) => {
          const formData = new FormData(form);
          const folderId = (formData.get('moveFolder') || '_root').toString();
          console.log('Move page to folder', {
            pageId,
            folderId,
          });
        },
      });

      if (moveDialogController) {
        actionDialogControllers.push(moveDialogController);
        actionDialogs.move = moveDialogController;
      }

      const trashDialogController = createActionDialog({
        name: 'trash',
        backdrop: trashDialog,
        dialog: trashDialogPanel,
        form: trashDialogForm,
        initialFocusSelector: '#trashReason',
        onOpen: () => {
          if (trashNoteInput instanceof HTMLTextAreaElement) {
            trashNoteInput.value = '';
          }
        },
        onSubmit: ({ pageId, form }) => {
          const formData = new FormData(form);
          const note = (formData.get('trashReason') || '').toString().trim();
          console.log('Move page to trash', {
            pageId,
            note: note || null,
          });
        },
      });

      if (trashDialogController) {
        actionDialogControllers.push(trashDialogController);
        actionDialogs.trash = trashDialogController;
      }

      const restoreDialogController = createActionDialog({
        name: 'restore',
        backdrop: restoreDialog,
        dialog: restoreDialogPanel,
        form: restoreDialogForm,
        initialFocusSelector: '#restorePublishToggle',
        onOpen: () => {
          if (restorePublishCheckbox instanceof HTMLInputElement) {
            restorePublishCheckbox.checked = false;
          }
        },
        onSubmit: ({ pageId, form }) => {
          const formData = new FormData(form);
          const publish = formData.has('restorePublish');
          console.log('Restore page', {
            pageId,
            publishImmediately: publish,
          });
        },
      });

      if (restoreDialogController) {
        actionDialogControllers.push(restoreDialogController);
        actionDialogs.restore = restoreDialogController;
      }

      const deleteDialogController = createActionDialog({
        name: 'delete-permanently',
        backdrop: deleteDialog,
        dialog: deleteDialogPanel,
        form: deleteDialogForm,
        initialFocusSelector: '#deleteAcknowledge',
        onOpen: () => {
          if (deleteAcknowledgeCheckbox instanceof HTMLInputElement) {
            deleteAcknowledgeCheckbox.checked = false;
          }
        },
        onSubmit: ({ pageId, form }) => {
          const formData = new FormData(form);
          const confirmed = formData.has('deleteAcknowledge');
          console.log('Delete page permanently', {
            pageId,
            confirmed,
          });
        },
      });

      if (deleteDialogController) {
        actionDialogControllers.push(deleteDialogController);
        actionDialogs['delete-permanently'] = deleteDialogController;
      }

      const moveFolderDialogController = createFolderActionDialog({
        name: 'move-folder',
        backdrop: moveFolderDialog,
        dialog: moveFolderDialogPanel,
        form: moveFolderForm,
        initialFocusSelector: '#moveFolderDestination',
        onOpen: ({ folderId }) => {
          if (!(moveFolderDestinationSelect instanceof HTMLSelectElement)) {
            return;
          }
          moveFolderDestinationSelect.innerHTML = '';
          moveFolderDestinationSelect.disabled = false;
          moveFolderDestinationSelect.required = true;
          folderOptions.forEach(({ value, label }) => {
            if (!value || value === folderId) {
              return;
            }
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            moveFolderDestinationSelect.append(option);
          });
          if (moveFolderDestinationSelect.options.length > 0) {
            moveFolderDestinationSelect.value = moveFolderDestinationSelect.options[0].value;
            moveFolderDestinationSelect.setCustomValidity('');
          } else {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'No available destinations';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            moveFolderDestinationSelect.append(placeholderOption);
            moveFolderDestinationSelect.disabled = true;
          }
          if (moveFolderSubmitButton instanceof HTMLButtonElement) {
            moveFolderSubmitButton.disabled = moveFolderDestinationSelect.disabled;
          }
        },
        onClose: () => {
          if (moveFolderDestinationSelect instanceof HTMLSelectElement) {
            moveFolderDestinationSelect.innerHTML = '';
            moveFolderDestinationSelect.disabled = false;
            moveFolderDestinationSelect.setCustomValidity('');
          }
          if (moveFolderSubmitButton instanceof HTMLButtonElement) {
            moveFolderSubmitButton.disabled = false;
          }
        },
        onSubmit: ({ folderId, form }) => {
          if (!(form instanceof HTMLFormElement)) {
            return true;
          }
          const formData = new FormData(form);
          const destination = (formData.get('destination') || '').toString();
          if (!destination) {
            if (moveFolderDestinationSelect instanceof HTMLSelectElement) {
              moveFolderDestinationSelect.setCustomValidity('Select a destination.');
              moveFolderDestinationSelect.reportValidity();
            }
            return false;
          }
          console.log('Move folder', { folderId, destination });
          return true;
        },
      });

      if (moveFolderDialogController) {
        actionDialogControllers.push(moveFolderDialogController);
        folderActionDialogs.move = moveFolderDialogController;
      }

      const deleteFolderDialogController = createFolderActionDialog({
        name: 'delete-folder',
        backdrop: deleteFolderDialog,
        dialog: deleteFolderDialogPanel,
        form: deleteFolderForm,
        initialFocusSelector: '#deleteFolderConfirmInput',
        onOpen: ({ folderName }) => {
          if (deleteFolderConfirmInput instanceof HTMLInputElement) {
            deleteFolderConfirmInput.value = '';
            deleteFolderConfirmInput.placeholder = folderName;
            deleteFolderConfirmInput.setCustomValidity('');
          }
        },
        onClose: () => {
          if (deleteFolderConfirmInput instanceof HTMLInputElement) {
            deleteFolderConfirmInput.value = '';
            deleteFolderConfirmInput.setCustomValidity('');
            deleteFolderConfirmInput.removeAttribute('placeholder');
          }
        },
        onSubmit: ({ folderId, folderName }) => {
          const typedValue = (deleteFolderConfirmInput?.value || '').trim();
          if (!typedValue || typedValue !== folderName) {
            if (deleteFolderConfirmInput instanceof HTMLInputElement) {
              deleteFolderConfirmInput.setCustomValidity('Enter the folder name exactly to confirm.');
              deleteFolderConfirmInput.reportValidity();
            }
            return false;
          }
          console.log('Delete folder permanently', { folderId });
          return true;
        },
      });

      if (deleteFolderDialogController) {
        actionDialogControllers.push(deleteFolderDialogController);
        folderActionDialogs.delete = deleteFolderDialogController;
      }

      const restoreAllDialogController = createFolderActionDialog({
        name: 'restore-all',
        backdrop: restoreAllDialog,
        dialog: restoreAllDialogPanel,
        form: restoreAllForm,
        onSubmit: ({ folderId }) => {
          console.log('Restore all pages for folder', { folderId });
          return true;
        },
      });

      if (restoreAllDialogController) {
        actionDialogControllers.push(restoreAllDialogController);
        folderActionDialogs['restore-all'] = restoreAllDialogController;
      }

      const emptyTrashDialogController = createFolderActionDialog({
        name: 'empty-trash',
        backdrop: emptyTrashDialog,
        dialog: emptyTrashDialogPanel,
        form: emptyTrashForm,
        initialFocusSelector: '#emptyTrashConfirmInput',
        onOpen: () => {
          if (emptyTrashConfirmInput instanceof HTMLInputElement) {
            emptyTrashConfirmInput.value = '';
            emptyTrashConfirmInput.setCustomValidity('');
          }
        },
        onClose: () => {
          if (emptyTrashConfirmInput instanceof HTMLInputElement) {
            emptyTrashConfirmInput.value = '';
            emptyTrashConfirmInput.setCustomValidity('');
          }
        },
        onSubmit: ({ folderId }) => {
          const typedValue = (emptyTrashConfirmInput?.value || '').trim();
          if (!typedValue || typedValue.toUpperCase() !== 'EMPTY') {
            if (emptyTrashConfirmInput instanceof HTMLInputElement) {
              emptyTrashConfirmInput.setCustomValidity('Type EMPTY to confirm.');
              emptyTrashConfirmInput.reportValidity();
            }
            return false;
          }
          console.log('Empty trash', { folderId });
          return true;
        },
      });

      if (emptyTrashDialogController) {
        actionDialogControllers.push(emptyTrashDialogController);
        folderActionDialogs.empty = emptyTrashDialogController;
      }

      const authorOptions = Array.from(
        new Set([
          ...pageRows.map((row) => row.dataset.author || '').filter(Boolean),
          ...Object.keys(AUTHOR_DETAILS),
        ])
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      const rowData = pageRows.map((row) => {
        const {
          pageId = '',
          status = 'all',
          type = '',
          author = '',
          title = '',
          template = '',
        } = row.dataset;
        const slugElement = row.querySelector('.title-text .subtitle');
        const slug = slugElement ? slugElement.textContent.trim() : '';
        const searchSource = [title, slug, status, type, author, template, row.textContent || '']
          .join(' ')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
        const reportIssues = new Set(
          (row.dataset.reportIssues || '')
            .split(/\s+/)
            .map((value) => value.trim())
            .filter(Boolean)
        );
        return {
          element: row,
          pageId,
          status,
          type,
          author,
          title,
          slug,
          template,
          created: row.dataset.created || '',
          modified: row.dataset.modified || '',
          reportIssues,
          searchText: searchSource,
        };
      });

      function applyRowVisualStyles() {
        rowData.forEach(({ element, type, author }) => {
          const typeChip = element.querySelector('.chip');
          if (typeChip) {
            typeChip.dataset.color = TYPE_STYLES[type] || 'slate';
          }

          const avatarSpan = element.querySelector('.author-filter .avatar span');
          if (avatarSpan) {
            const { color = DEFAULT_AUTHOR_COLOR } = AUTHOR_DETAILS[author] || {};
            avatarSpan.dataset.color = color;
          }
        });
      }

      applyRowVisualStyles();

      copyPageButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const row = button.closest('.page-row');
          const pageId = row?.dataset.pageId;
          if (pageId) {
            openCopyPageDialog(pageId, button);
          }
        });
      });

      function populatePageSettingsControls() {
        if (pageSettingsPrivacySelect) {
          pageSettingsPrivacySelect.value = 'any';
        }
        [
          pageSettingsHomeToggle,
          pageSettingsComplexUrlCheckbox,
          pageSettingsHideSearchCheckbox,
          pageSettingsHideSiteSearchCheckbox,
          pageSettingsRequireLoginCheckbox,
        ].forEach((checkbox) => {
          if (checkbox instanceof HTMLInputElement) {
            checkbox.checked = false;
          }
        });
        [
          pageSettingsCanonicalInput,
          pageSettingsMetaTitleInput,
          pageSettingsMetaDescriptionInput,
          pageSettingsOgTitleInput,
          pageSettingsOgDescriptionInput,
        ].forEach((input) => {
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.value = '';
          }
        });
        if (pageSettingsOgImageInput instanceof HTMLInputElement) {
          pageSettingsOgImageInput.value = '';
        }
        setPageSettingsType(defaultPageTypeValue);
        setPageSettingsTemplate(defaultPageTemplateValue);
      }

      function resetPageSettingsDialog() {
        pageSettingsForm?.reset();
        if (pageSettingsDialogSubtitle) {
          pageSettingsDialogSubtitle.textContent = '';
        }
        if (pageSettingsIdInput) {
          pageSettingsIdInput.value = '';
        }
        populatePageSettingsControls();
        setActivePageSettingsTab(defaultPageSettingsTab);
      }

     function openPageSettingsDialog(pageId, trigger) {
        if (!pageSettingsDialog || !pageId) {
          return;
        }
        const row = pageRowById.get(pageId);
        if (!row) {
          return;
        }
        resetPageSettingsDialog();
        populatePageSettingsControls();
        activePageId = pageId;
        lastPageSettingsTrigger = trigger || null;

        const fallbackTitle =
          row.dataset.title ||
          row.querySelector('.title-button')?.textContent?.trim() ||
          'Untitled page';
        const slug = row.dataset.pageId || '';
        const metaTitle = row.dataset.metaTitle || fallbackTitle;
        const metaDescription = row.dataset.metaDescription || '';
        const ogTitle = row.dataset.ogTitle || fallbackTitle;
        const ogDescription = row.dataset.ogDescription || '';
        const privacy = row.dataset.privacy || 'any';
        const requiresLogin = row.dataset.requireLogin === 'true';
        const complexUrl = row.dataset.complexUrl === 'true';
        const hideSearch = row.dataset.hideSearch === 'true';
        const hideSiteSearch = row.dataset.hideSiteSearch === 'true';
        const canonicalUrl = row.dataset.canonicalUrl || '';
        const isHomePage = row.dataset.home === 'true';

        if (pageSettingsDialogTitle) {
          pageSettingsDialogTitle.textContent = 'Page settings';
        }
        if (pageSettingsDialogSubtitle) {
          pageSettingsDialogSubtitle.textContent = fallbackTitle;
        }
        if (pageSettingsIdInput) {
          pageSettingsIdInput.value = pageId;
        }
        if (pageSettingsTitleInput) {
          pageSettingsTitleInput.value = fallbackTitle;
        }
        if (pageSettingsSlugInput) {
          pageSettingsSlugInput.value = slug;
        }
        if (pageSettingsHomeToggle) {
          pageSettingsHomeToggle.checked = isHomePage;
        }
        if (pageSettingsPrivacySelect) {
          if (!pageSettingsPrivacySelect.querySelector(`option[value="${privacy}"]`)) {
            const option = document.createElement('option');
            option.value = privacy;
            option.textContent = privacy;
            pageSettingsPrivacySelect.append(option);
          }
          pageSettingsPrivacySelect.value = privacy;
        }
        if (pageSettingsRequireLoginCheckbox) {
          pageSettingsRequireLoginCheckbox.checked = requiresLogin;
        }
        if (pageSettingsComplexUrlCheckbox) {
          pageSettingsComplexUrlCheckbox.checked = complexUrl;
        }
        if (pageSettingsHideSearchCheckbox) {
          pageSettingsHideSearchCheckbox.checked = hideSearch;
        }
        if (pageSettingsHideSiteSearchCheckbox) {
          pageSettingsHideSiteSearchCheckbox.checked = hideSiteSearch;
        }
        if (pageSettingsCanonicalInput) {
          pageSettingsCanonicalInput.value = canonicalUrl;
        }
        if (pageSettingsMetaTitleInput) {
          pageSettingsMetaTitleInput.value = metaTitle;
        }
        if (pageSettingsMetaDescriptionInput) {
          pageSettingsMetaDescriptionInput.value = metaDescription;
        }
        if (pageSettingsOgTitleInput) {
          pageSettingsOgTitleInput.value = ogTitle;
        }
        if (pageSettingsOgDescriptionInput) {
          pageSettingsOgDescriptionInput.value = ogDescription;
        }

        const typeValue = row.dataset.type || defaultPageTypeValue;
        setPageSettingsType(typeValue);

        const suggestedTemplate =
          TEMPLATE_DEFAULTS_BY_TYPE[typeValue] || defaultPageTemplateValue;
        const templateValue = row.dataset.template || suggestedTemplate;
        if (!row.dataset.template && templateValue) {
          row.dataset.template = templateValue;
        }
        setPageSettingsTemplate(templateValue);

        pageSettingsDialog.setAttribute('aria-hidden', 'false');
        syncBodyScrollState();
        window.requestAnimationFrame(() => {
          pageSettingsTitleInput?.focus({ preventScroll: true });
        });
      }

      function closePageSettingsDialog({ focusTrigger = true } = {}) {
        if (!pageSettingsDialog) {
          return;
        }
        pageSettingsDialog.setAttribute('aria-hidden', 'true');
        syncBodyScrollState();
        if (focusTrigger && lastPageSettingsTrigger instanceof HTMLElement) {
          lastPageSettingsTrigger.focus({ preventScroll: true });
        }
        activePageId = null;
        lastPageSettingsTrigger = null;
        resetPageSettingsDialog();
      }

      populatePageSettingsControls();
      resetPageSettingsDialog();

      const folderState = (() => {
        try {
          const stored = localStorage.getItem(folderStateStorageKey);
          if (!stored) {
            return {};
          }
          const parsed = JSON.parse(stored);
          return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (error) {
          console.warn('Unable to parse folder state', error);
          return {};
        }
      })();

      let isFlatView = (() => {
        try {
          const stored = localStorage.getItem(flatViewStorageKey);
          return stored === 'true';
        } catch (error) {
          console.warn('Unable to parse flat view preference', error);
          return false;
        }
      })();

      let activeFolderId = null;
      let folderDialogMode = 'edit';
      let lastFolderDialogTrigger = null;
      const DEFAULT_FOLDER_COLOR = 'blue';
      let activePageId = null;
      let lastPageSettingsTrigger = null;
      let activeCopyPageId = null;
      let lastCopyPageTrigger = null;
      function syncBodyScrollState() {
        const drawerOpen = filtersDrawer?.getAttribute('aria-hidden') === 'false';
        const createDialogOpen = dialog?.getAttribute('aria-hidden') === 'false';
        const folderDialogOpen = folderSettingsDialog?.getAttribute('aria-hidden') === 'false';
        const newPageDialogOpen = newPageDialog?.getAttribute('aria-hidden') === 'false';
        const pageSettingsOpen = pageSettingsDialog?.getAttribute('aria-hidden') === 'false';
        const copyPageDialogOpen = copyPageDialog?.getAttribute('aria-hidden') === 'false';
        const actionDialogsOpen = actionDialogControllers.some(
          (controller) => typeof controller?.isOpen === 'function' && controller.isOpen()
        );
        document.body.style.overflow =
          drawerOpen ||
          createDialogOpen ||
          folderDialogOpen ||
          newPageDialogOpen ||
          pageSettingsOpen ||
          copyPageDialogOpen ||
          actionDialogsOpen
            ? 'hidden'
            : '';
      }

      function closeActionMenu(menu, { focusTrigger = false } = {}) {
        if (!menu) {
          return;
        }
        const trigger = menu.querySelector('[data-action-menu-trigger]');
        const dropdown = menu.querySelector('[data-action-menu-dropdown]');
        if (!trigger || !dropdown) {
          return;
        }
        menu.dataset.open = 'false';
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.hidden = true;
        if (focusTrigger) {
          trigger.focus({ preventScroll: true });
        }
      }

      function openActionMenu(menu) {
        if (!menu) {
          return;
        }
        const trigger = menu.querySelector('[data-action-menu-trigger]');
        const dropdown = menu.querySelector('[data-action-menu-dropdown]');
        if (!trigger || !dropdown) {
          return;
        }
        closeAllActionMenus(menu);
        menu.dataset.open = 'true';
        trigger.setAttribute('aria-expanded', 'true');
        dropdown.hidden = false;
      }

      function closeAllActionMenus(exceptMenu = null) {
        actionMenus.forEach((menu) => {
          if (menu === exceptMenu) {
            return;
          }
          closeActionMenu(menu);
        });
      }

      function createFocusTrap(container) {
        if (!(container instanceof HTMLElement)) {
          return {
            activate() {},
            deactivate() {},
          };
        }

        const getFocusableElements = () =>
          Array.from(
            container.querySelectorAll(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((element) => {
            if (!(element instanceof HTMLElement)) {
              return false;
            }
            if (element.hasAttribute('disabled')) {
              return false;
            }
            if (element.getAttribute('aria-hidden') === 'true') {
              return false;
            }
            const { offsetParent } = element;
            return offsetParent !== null || element === document.activeElement;
          });

        const handleKeydown = (event) => {
          if (event.key !== 'Tab') {
            return;
          }

          const focusable = getFocusableElements();
          if (focusable.length === 0) {
            event.preventDefault();
            container.focus({ preventScroll: true });
            return;
          }

          const currentIndex = focusable.indexOf(document.activeElement);
          if (event.shiftKey) {
            if (currentIndex <= 0) {
              event.preventDefault();
              focusable[focusable.length - 1].focus({ preventScroll: true });
            }
          } else if (currentIndex === focusable.length - 1) {
            event.preventDefault();
            focusable[0].focus({ preventScroll: true });
          }
        };

        return {
          activate({ focusElement = null } = {}) {
            container.addEventListener('keydown', handleKeydown);
            const focusable = getFocusableElements();
            const target =
              focusElement instanceof HTMLElement
                ? focusElement
                : focusable[0] || container;
            if (target instanceof HTMLElement) {
              target.focus({ preventScroll: true });
            }
          },
          deactivate() {
            container.removeEventListener('keydown', handleKeydown);
          },
        };
      }

      function getPageNameFromRow(row) {
        if (!(row instanceof HTMLElement)) {
          return 'this page';
        }
        const explicitTitle = row.dataset.title;
        if (explicitTitle) {
          return explicitTitle;
        }
        const buttonTitle = row.querySelector('.title-button')?.textContent?.trim();
        if (buttonTitle) {
          return buttonTitle;
        }
        const textTitle = row.querySelector('.title-text')?.textContent?.trim();
        if (textTitle) {
          return textTitle;
        }
        return row.dataset.pageId || 'this page';
      }

      function getFolderNameFromRow(row) {
        if (!(row instanceof HTMLElement)) {
          return 'this folder';
        }
        const explicitName = row.dataset.folderName;
        if (explicitName) {
          return explicitName;
        }
        const textName = row.querySelector('.folder-name')?.textContent?.trim();
        if (textName) {
          return textName;
        }
        const identifier = row.dataset.folder;
        if (identifier === '_root') {
          return 'Root';
        }
        if (identifier === 'trash') {
          return 'Trash';
        }
        return identifier || 'this folder';
      }

      function formatDateInputValue(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
          return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      function formatTimeInputValue(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
          return '';
        }
        return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
      }

      function createActionDialog({
        name,
        backdrop,
        dialog,
        form = null,
        initialFocusSelector = '[data-dialog-primary]',
        onOpen = null,
        onClose = null,
        onSubmit = null,
      }) {
        if (!(backdrop instanceof HTMLElement) || !(dialog instanceof HTMLElement)) {
          return null;
        }

        const trap = createFocusTrap(dialog);
        const pageNameTargets = Array.from(
          dialog.querySelectorAll('[data-dialog-page-name]')
        );
        const closeButtons = Array.from(backdrop.querySelectorAll('[data-dialog-close]'));
        const cancelButtons = Array.from(backdrop.querySelectorAll('[data-dialog-cancel]'));

        let activePageIdForDialog = null;
        let lastTriggerForDialog = null;

        const isOpen = () => backdrop.getAttribute('aria-hidden') === 'false';

        const setPageName = (name) => {
          pageNameTargets.forEach((target) => {
            target.textContent = name;
          });
        };

        const open = (pageId, { trigger = null } = {}) => {
          if (!pageId) {
            return;
          }
          const row = pageRowById.get(pageId) || null;
          activePageIdForDialog = pageId;
          lastTriggerForDialog = trigger instanceof HTMLElement ? trigger : null;
          setPageName(getPageNameFromRow(row));
          if (typeof onOpen === 'function') {
            onOpen({ pageId, row, dialog, backdrop });
          }
          backdrop.setAttribute('aria-hidden', 'false');
          syncBodyScrollState();
          window.requestAnimationFrame(() => {
            const initialFocus = initialFocusSelector
              ? dialog.querySelector(initialFocusSelector)
              : null;
            trap.activate({
              focusElement: initialFocus instanceof HTMLElement ? initialFocus : null,
            });
          });
        };

        const close = ({ focusTrigger = true } = {}) => {
          if (!isOpen()) {
            return;
          }
          trap.deactivate();
          backdrop.setAttribute('aria-hidden', 'true');
          syncBodyScrollState();
          if (form instanceof HTMLFormElement) {
            form.reset();
          }
          if (typeof onClose === 'function') {
            onClose({ pageId: activePageIdForDialog });
          }
          const triggerElement = lastTriggerForDialog;
          activePageIdForDialog = null;
          lastTriggerForDialog = null;
          if (focusTrigger && triggerElement instanceof HTMLElement) {
            triggerElement.focus({ preventScroll: true });
          }
        };

        closeButtons.forEach((button) => {
          button.addEventListener('click', () => {
            close();
          });
        });

        cancelButtons.forEach((button) => {
          button.addEventListener('click', () => {
            close();
          });
        });

        backdrop.addEventListener('click', (event) => {
          if (event.target === backdrop) {
            close();
          }
        });

        if (form instanceof HTMLFormElement) {
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!activePageIdForDialog) {
              close();
              return;
            }
            if (typeof onSubmit === 'function') {
              const row = pageRowById.get(activePageIdForDialog) || null;
              onSubmit({ pageId: activePageIdForDialog, row, form });
            }
            close();
          });
        }

        return {
          name,
          open,
          close,
          isOpen,
          getPageId: () => activePageIdForDialog,
        };
      }

      function createFolderActionDialog({
        name,
        backdrop,
        dialog,
        form = null,
        initialFocusSelector = '[data-folder-dialog-primary]',
        onOpen = null,
        onClose = null,
        onSubmit = null,
      }) {
        if (!(backdrop instanceof HTMLElement) || !(dialog instanceof HTMLElement)) {
          return null;
        }

        const trap = createFocusTrap(dialog);
        const nameTargets = Array.from(dialog.querySelectorAll('[data-folder-dialog-folder-name]'));
        const closeButtons = Array.from(backdrop.querySelectorAll('[data-folder-dialog-close]'));
        const cancelButtons = Array.from(backdrop.querySelectorAll('[data-folder-dialog-cancel]'));

        let activeFolderIdForDialog = null;
        let activeFolderNameForDialog = 'this folder';
        let lastTriggerForDialog = null;

        const isOpen = () => backdrop.getAttribute('aria-hidden') === 'false';

        const setFolderName = (value) => {
          nameTargets.forEach((target) => {
            target.textContent = value;
          });
        };

        const open = (folderId, { trigger = null } = {}) => {
          if (!folderId) {
            return;
          }
          const row = folderRowById.get(folderId) || null;
          activeFolderIdForDialog = folderId;
          activeFolderNameForDialog = getFolderNameFromRow(row);
          lastTriggerForDialog = trigger instanceof HTMLElement ? trigger : null;
          if (form instanceof HTMLFormElement) {
            form.reset();
          }
          setFolderName(activeFolderNameForDialog);
          if (typeof onOpen === 'function') {
            onOpen({
              folderId,
              folderName: activeFolderNameForDialog,
              row,
              dialog,
              backdrop,
              form,
            });
          }
          backdrop.setAttribute('aria-hidden', 'false');
          syncBodyScrollState();
          window.requestAnimationFrame(() => {
            const initialFocus = initialFocusSelector
              ? dialog.querySelector(initialFocusSelector)
              : null;
            trap.activate({
              focusElement: initialFocus instanceof HTMLElement ? initialFocus : null,
            });
          });
        };

        const close = ({ focusTrigger = true } = {}) => {
          if (!isOpen()) {
            return;
          }
          trap.deactivate();
          backdrop.setAttribute('aria-hidden', 'true');
          syncBodyScrollState();
          if (form instanceof HTMLFormElement) {
            form.reset();
          }
          if (typeof onClose === 'function') {
            onClose({
              folderId: activeFolderIdForDialog,
              folderName: activeFolderNameForDialog,
              dialog,
              backdrop,
            });
          }
          const triggerElement = lastTriggerForDialog;
          activeFolderIdForDialog = null;
          activeFolderNameForDialog = 'this folder';
          lastTriggerForDialog = null;
          if (focusTrigger && triggerElement instanceof HTMLElement) {
            triggerElement.focus({ preventScroll: true });
          }
        };

        closeButtons.forEach((button) => {
          button.addEventListener('click', () => {
            close();
          });
        });

        cancelButtons.forEach((button) => {
          button.addEventListener('click', () => {
            close();
          });
        });

        backdrop.addEventListener('click', (event) => {
          if (event.target === backdrop) {
            close();
          }
        });

        if (form instanceof HTMLFormElement) {
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!activeFolderIdForDialog) {
              close();
              return;
            }
            if (!form.reportValidity()) {
              return;
            }
            let shouldClose = true;
            if (typeof onSubmit === 'function') {
              const row = folderRowById.get(activeFolderIdForDialog) || null;
              const result = onSubmit({
                folderId: activeFolderIdForDialog,
                folderName: activeFolderNameForDialog,
                row,
                form,
              });
              if (result === false) {
                shouldClose = false;
              }
            }
            if (shouldClose) {
              close();
            }
          });
        }

        return {
          name,
          open,
          close,
          isOpen,
          getFolderId: () => activeFolderIdForDialog,
        };
      }

      function matchesBaseFilters(item) {
        if (state.search && !item.searchText.includes(state.search)) {
          return false;
        }

        if (state.authors.size > 0 && !state.authors.has(item.author)) {
          return false;
        }

        if (state.types.size > 0 && !state.types.has(item.type)) {
          return false;
        }

        if (state.statuses.size > 0 && !state.statuses.has(item.status)) {
          return false;
        }

        if (state.dateStart || state.dateEnd) {
          const targetDate = item.modified || item.created;
          if (!targetDate) {
            return false;
          }
          if (state.dateStart && targetDate < state.dateStart) {
            return false;
          }
          if (state.dateEnd && targetDate > state.dateEnd) {
            return false;
          }
        }

        if (state.reportCards.size > 0) {
          if (item.reportIssues.size === 0) {
            return false;
          }
          for (const value of state.reportCards) {
            if (!item.reportIssues.has(value)) {
              return false;
            }
          }
        }

        return true;
      }

      function updateGroupRowsVisibility() {
        folderRows.forEach((folderRow) => {
          const folderId = folderRow.dataset.folder || '_root';
          const members = folderMembers.get(folderId) || [];
          const hasVisible = members.some((row) => !row.classList.contains('is-filter-hidden'));
          folderRow.classList.toggle('is-filter-hidden', !hasVisible);
        });
      }

      function updateFolderCounts() {
        folderRows.forEach((folderRow) => {
          const folderId = folderRow.dataset.folder || '_root';
          const members = folderMembers.get(folderId) || [];
          const visibleCount = members.filter((row) => !row.classList.contains('is-filter-hidden')).length;
          const totalAttr = Number(folderRow.dataset.folderTotal || members.length);
          const total = Number.isNaN(totalAttr) ? members.length : totalAttr;
          const label = folderRow.querySelector('[data-folder-count]');
          if (!label) {
            return;
          }
          const text =
            visibleCount !== total
              ? `${visibleCount} of ${total} pages`
              : `${total} page${total === 1 ? '' : 's'}`;
          label.textContent = text;
        });
      }

      function updateCounts(baseMatches) {
        const counts = { all: 0, published: 0, unpublished: 0, draft: 0, scheduled: 0, trash: 0 };
        rowData.forEach((item) => {
          if (!baseMatches.get(item)) {
            return;
          }
          const key = counts[item.status] !== undefined ? item.status : null;
          if (key) {
            counts[key] += 1;
          }
          if (item.status !== 'trash') {
            counts.all += 1;
          }
        });

        countBadges.forEach((badge) => {
          const key = badge.dataset.statusCount;
          if (!key) {
            return;
          }
          badge.textContent = counts[key] ?? 0;
        });
      }

      function renderChips() {
        if (!filterChips) {
          return;
        }

        const chips = [];

        if (state.search) {
          chips.push({ type: 'search', value: state.searchRaw });
        }

        state.authors.forEach((value) => {
          chips.push({ type: 'author', value });
        });

        state.types.forEach((value) => {
          chips.push({ type: 'type', value });
        });

        state.statuses.forEach((value) => {
          chips.push({ type: 'status', value });
        });

        state.reportCards.forEach((value) => {
          chips.push({ type: 'report', value });
        });

        if (state.dateStart || state.dateEnd) {
          chips.push({ type: 'date', value: { start: state.dateStart, end: state.dateEnd } });
        }

        filterChips.innerHTML = '';

        if (chips.length === 0) {
          filterChips.hidden = true;
          updateActiveFilterSummary(0);
          return;
        }

        filterChips.hidden = false;

        chips.forEach((chip) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'chip-button';
          button.dataset.chipType = chip.type;
          let visualLabel = '';
          let ariaLabelValue = '';

          switch (chip.type) {
            case 'search':
              visualLabel = `Search: ${chip.value}`;
              ariaLabelValue = visualLabel;
              button.dataset.chipValue = chip.value;
              break;
            case 'author':
              visualLabel = `Author: ${getAuthorInitials(chip.value) || chip.value}`;
              ariaLabelValue = `Author: ${chip.value}`;
              button.dataset.chipValue = chip.value;
              break;
            case 'type':
              visualLabel = `Type: ${chip.value}`;
              ariaLabelValue = visualLabel;
              button.dataset.chipValue = chip.value;
              break;
            case 'status':
              visualLabel = `Status: ${getStatusLabel(chip.value)}`;
              ariaLabelValue = visualLabel;
              button.dataset.chipValue = chip.value;
              break;
            case 'report':
              visualLabel = `Report: ${getReportLabel(chip.value)}`;
              ariaLabelValue = visualLabel;
              button.dataset.chipValue = chip.value;
              break;
            case 'date': {
              const startText = formatDateForDisplay(chip.value.start);
              const endText = formatDateForDisplay(chip.value.end);
              if (chip.value.start && chip.value.end) {
                visualLabel = `Modified: ${startText} – ${endText}`;
              } else if (chip.value.start) {
                visualLabel = `Modified: From ${startText}`;
              } else if (chip.value.end) {
                visualLabel = `Modified: Through ${endText}`;
              } else {
                visualLabel = 'Modified date';
              }
              ariaLabelValue = visualLabel;
              button.dataset.chipStart = chip.value.start || '';
              button.dataset.chipEnd = chip.value.end || '';
              break;
            }
            default:
              visualLabel = chip.value;
              ariaLabelValue = visualLabel;
              button.dataset.chipValue = chip.value;
          }

          button.setAttribute('aria-label', `Remove ${ariaLabelValue}`);

          const labelSpan = document.createElement('span');
          labelSpan.textContent = visualLabel;
          const icon = document.createElement('i');
          icon.className = 'fa-solid fa-xmark';
          icon.setAttribute('aria-hidden', 'true');

          button.append(labelSpan, icon);
          filterChips.appendChild(button);
        });

        updateActiveFilterSummary(chips.length);
      }

      function getRowsInScope() {
        return pageRows.filter(
          (row) => !row.classList.contains('is-filter-hidden') && !row.classList.contains('is-collapsed')
        );
      }

      function setPageSelection(row, shouldSelect) {
        const checkbox = row.querySelector('[data-row-checkbox]');
        const pageId = row.dataset.pageId;
        if (!checkbox || !pageId) {
          return;
        }
        checkbox.checked = shouldSelect;
        row.classList.toggle('is-selected', shouldSelect);
        if (shouldSelect) {
          selection.add(pageId);
        } else {
          selection.delete(pageId);
        }
      }

      function updateMasterCheckbox() {
        if (!masterCheckbox) {
          return;
        }
        const scopeRows = getRowsInScope();
        const total = scopeRows.length;
        const selectedInScope = scopeRows.filter((row) => selection.has(row.dataset.pageId)).length;
        masterCheckbox.disabled = total === 0;
        masterCheckbox.checked = total > 0 && selectedInScope === total;
        masterCheckbox.indeterminate = selectedInScope > 0 && selectedInScope < total;
        if (total === 0) {
          masterCheckbox.indeterminate = false;
          masterCheckbox.checked = false;
        }
      }

      function updateFolderCheckboxes() {
        folderCheckboxes.forEach((checkbox) => {
          const folderId = checkbox.dataset.folderId || '_root';
          const members = folderMembers.get(folderId) || [];
          const scopedMembers = members.filter((row) => !row.classList.contains('is-filter-hidden'));
          const total = scopedMembers.length;
          const selectedCount = scopedMembers.filter((row) => selection.has(row.dataset.pageId)).length;
          checkbox.disabled = total === 0;
          checkbox.checked = total > 0 && selectedCount === total;
          checkbox.indeterminate = selectedCount > 0 && selectedCount < total;
          if (total === 0) {
            checkbox.indeterminate = false;
            checkbox.checked = false;
          }
        });
      }

      function updateBulkBar() {
        if (!bulkBar || !selectionCount) {
          return;
        }
        const count = selection.size;
        const label = count === 1 ? '1 selected' : `${count} selected`;
        selectionCount.textContent = label;
        const isActive = count > 0;
        bulkBar.classList.toggle('is-active', isActive);
        bulkBar.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        bulkActionButtons.forEach((button) => {
          button.disabled = count === 0;
        });
        if (clearSelectionButton) {
          clearSelectionButton.disabled = count === 0;
        }
        syncBulkBarOffset();
      }

      function syncBulkBarOffset() {
        if (!bulkBar) {
          return;
        }
        const offset = bulkBar.classList.contains('is-active')
          ? bulkBar.getBoundingClientRect().height + 16
          : 0;
        document.body.style.setProperty('--pages-bulk-bar-offset', `${offset}px`);
      }

      function getSortValue(row, key) {
        switch (key) {
          case 'status': {
            const order = { published: 0, scheduled: 1, draft: 2, unpublished: 3, trash: 4 };
            return order[row.dataset.status] ?? 99;
          }
          case 'type':
            return (row.dataset.type || '').toLowerCase();
          case 'author':
            return (row.dataset.author || '').toLowerCase();
          case 'reports':
            return Number(row.dataset.reportValue || 0);
          case 'created':
            return Date.parse(row.dataset.created || 0);
          case 'modified':
            return Date.parse(row.dataset.modified || 0);
          case 'title':
            return (row.dataset.title || '').toLowerCase();
          default:
            return 0;
        }
      }

      function compareRows(a, b, key, direction) {
        const valueA = getSortValue(a, key);
        const valueB = getSortValue(b, key);
        let result;
        if (
          typeof valueA === 'number' &&
          typeof valueB === 'number' &&
          !Number.isNaN(valueA) &&
          !Number.isNaN(valueB)
        ) {
          result = valueA - valueB;
        } else {
          result = String(valueA).localeCompare(String(valueB), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        }
        return direction === 'asc' ? result : -result;
      }

      function getNextGroupRow(folderRow) {
        let sibling = folderRow.nextElementSibling;
        while (sibling && !sibling.classList.contains('group-row')) {
          sibling = sibling.nextElementSibling;
        }
        return sibling;
      }

      function applySort() {
        if (!state.sortKey) {
          return;
        }

        folderRows.forEach((folderRow) => {
          const folderId = folderRow.dataset.folder || '_root';
          const members = folderMembers.get(folderId) || [];
          if (members.length === 0) {
            return;
          }
          const sorted = members
            .slice()
            .sort((a, b) => compareRows(a, b, state.sortKey, state.sortDirection));
          const tbody = folderRow.parentElement;
          const marker = getNextGroupRow(folderRow);
          sorted.forEach((row) => {
            tbody.insertBefore(row, marker);
          });
          folderMembers.set(folderId, sorted);
        });

        const rootMembers = folderMembers.get('_root') || [];
        if (rootMembers.length === 0) {
          return;
        }

        const pinnedRows = rootMembers.filter((row) => row.dataset.pinned === 'true');
        const unpinnedRows = rootMembers.filter((row) => row.dataset.pinned !== 'true');
        const sortedUnpinned = unpinnedRows
          .slice()
          .sort((a, b) => compareRows(a, b, state.sortKey, state.sortDirection));
        const tbody = rootMembers[0]?.parentElement || folderRows[0]?.parentElement || null;
        if (!tbody) {
          folderMembers.set('_root', [...pinnedRows, ...sortedUnpinned]);
          return;
        }

        const firstFolderRow = folderRows[0] || null;
        const pinnedMarker =
          firstFolderRow || sortedUnpinned[0] || unpinnedRows[0] || tbody.firstChild;
        pinnedRows.forEach((row) => {
          tbody.insertBefore(row, pinnedMarker);
        });

        const afterLastFolderMarker = (() => {
          if (folderRows.length === 0) {
            return null;
          }
          const lastFolderRow = folderRows[folderRows.length - 1];
          const nextGroupRow = getNextGroupRow(lastFolderRow);
          return nextGroupRow || null;
        })();

        sortedUnpinned.forEach((row) => {
          tbody.insertBefore(row, afterLastFolderMarker);
        });

        folderMembers.set('_root', [...pinnedRows, ...sortedUnpinned]);
      }

      function updateSortIndicators() {
        sortButtons.forEach((button) => {
          const key = button.dataset.sortKey;
          const isActive = key === state.sortKey;
          button.classList.toggle('is-active', isActive);
          const indicator = button.querySelector('.sort-indicator');
          if (indicator) {
            indicator.textContent = isActive ? (state.sortDirection === 'asc' ? '▲' : '▼') : '▲';
          }
          const headerCell = button.closest('th');
          if (headerCell) {
            headerCell.setAttribute(
              'aria-sort',
              isActive ? (state.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
            );
          }
        });
      }

      function updateFlatViewToggleButton() {
        if (!flatViewToggleButton) {
          return;
        }

        const label = isFlatView ? 'Show pages in folders' : 'Show pages without folders';
        flatViewToggleButton.setAttribute('aria-label', label);
        flatViewToggleButton.setAttribute('title', label);
        flatViewToggleButton.setAttribute('aria-pressed', isFlatView ? 'true' : 'false');
        flatViewToggleButton.setAttribute('data-tooltip', label);
        if (flatViewToggleIcon) {
          flatViewToggleIcon.classList.remove('fa-list', 'fa-folder-tree');
          flatViewToggleIcon.classList.add(isFlatView ? 'fa-folder-tree' : 'fa-list');
        }
      }

      function updateFolderViewToggleButtonState() {
        if (!folderViewToggleButton) {
          return;
        }

        const setFolderToggleIcon = (isExpanded) => {
          if (!folderViewToggleIcon) {
            return;
          }
          folderViewToggleIcon.classList.remove('fa-folder', 'fa-folder-open');
          folderViewToggleIcon.classList.add(isExpanded ? 'fa-folder-open' : 'fa-folder');
        };

        if (isFlatView) {
          const label = 'Folder controls hidden in flat view';
          folderViewToggleButton.setAttribute('aria-label', label);
          folderViewToggleButton.setAttribute('title', label);
          folderViewToggleButton.setAttribute('aria-pressed', 'false');
          folderViewToggleButton.setAttribute('data-tooltip', label);
          folderViewToggleButton.disabled = true;
          setFolderToggleIcon(false);
          return;
        }

        const availableToggles = folderToggleButtons.filter((button) => button.dataset.folderToggle);
        if (availableToggles.length === 0) {
          folderViewToggleButton.setAttribute('aria-label', 'Expand all folders');
          folderViewToggleButton.setAttribute('title', 'Expand all folders');
          folderViewToggleButton.setAttribute('aria-pressed', 'false');
          folderViewToggleButton.setAttribute('data-tooltip', 'Expand all folders');
          folderViewToggleButton.disabled = true;
          setFolderToggleIcon(false);
          return;
        }

        folderViewToggleButton.disabled = false;

        const allExpanded = availableToggles.every(
          (button) => button.getAttribute('aria-expanded') === 'true'
        );
        const label = allExpanded ? 'Collapse all folders' : 'Expand all folders';
        folderViewToggleButton.setAttribute('aria-label', label);
        folderViewToggleButton.setAttribute('title', label);
        folderViewToggleButton.setAttribute('aria-pressed', allExpanded ? 'true' : 'false');
        folderViewToggleButton.setAttribute('data-tooltip', label);
        setFolderToggleIcon(allExpanded);
      }

      function setFolderExpanded(folderId, expanded, persist = true) {
        const toggle = document.querySelector(`[data-folder-toggle="${folderId}"]`);
        const members = folderMembers.get(folderId) || [];
        if (toggle) {
          toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          const icon = toggle.querySelector('[data-folder-icon]');
          if (icon) {
            icon.classList.remove('fa-folder-open', 'fa-folder');
            icon.classList.add(expanded ? 'fa-folder-open' : 'fa-folder');
          }
        }
        members.forEach((row) => {
          row.classList.toggle('is-collapsed', !expanded);
          if (expanded) {
            row.removeAttribute('aria-hidden');
          } else {
            row.setAttribute('aria-hidden', 'true');
          }
        });
        if (persist) {
          folderState[folderId] = expanded;
          try {
            localStorage.setItem(folderStateStorageKey, JSON.stringify(folderState));
          } catch (error) {
            console.warn('Unable to persist folder state', error);
          }
        }
        updateFolderViewToggleButtonState();
        updateMasterCheckbox();
        updateBulkBar();
      }

      function refreshFolderExpansionFromState() {
        if (isFlatView) {
          return;
        }
        folderToggleButtons.forEach((button) => {
          const folderId = button.dataset.folderToggle;
          if (!folderId) {
            return;
          }
          const stored = folderState[folderId];
          const expanded = stored !== undefined ? Boolean(stored) : true;
          setFolderExpanded(folderId, expanded, false);
        });
      }

      function applyFlatViewState({ persist = true } = {}) {
        document.body.classList.toggle('pages-flat-view', isFlatView);

        if (isFlatView) {
          pageRows.forEach((row) => {
            row.classList.remove('is-collapsed');
            row.removeAttribute('aria-hidden');
          });
        } else {
          refreshFolderExpansionFromState();
        }

        updateFlatViewToggleButton();
        updateFolderViewToggleButtonState();
        updateGroupRowsVisibility();
        updateMasterCheckbox();
        updateFolderCheckboxes();
        updateBulkBar();

        if (persist) {
          try {
            localStorage.setItem(flatViewStorageKey, isFlatView ? 'true' : 'false');
          } catch (error) {
            console.warn('Unable to persist flat view preference', error);
          }
        }
      }

      function updateRows() {
        const baseMatches = new Map();

        rowData.forEach((item) => {
          const matchesBase = matchesBaseFilters(item);
          baseMatches.set(item, matchesBase);
          const matchesStatus =
            state.status === 'all'
              ? item.status !== 'trash'
              : item.status === state.status;
          const shouldShow = matchesBase && matchesStatus;
          item.element.classList.toggle('is-filter-hidden', !shouldShow);
          if (!shouldShow && selection.has(item.pageId)) {
            setPageSelection(item.element, false);
          }
        });

        updateGroupRowsVisibility();
        updateFolderCounts();
        updateCounts(baseMatches);
        renderChips();
        updateFolderCheckboxes();
        updateMasterCheckbox();
        updateBulkBar();
      }

      function focusSearchInput() {
        if (!searchInput) {
          return;
        }
        searchInput.focus();
        searchInput.select();
      }

      const authorButtons = [];
      const statusButtons = [];
      const typeButtons = [];
      const reportCheckboxes = [];

      function renderAuthorFilters() {
        if (!authorFilterList) {
          return;
        }
        authorFilterList.innerHTML = '';
        authorButtons.length = 0;

        const authors = Array.from(new Set(rowData.map((item) => item.author)))
          .filter(Boolean)
          .sort();

        authors.forEach((author) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'author-filter-chip';
          button.dataset.authorValue = author;
          button.dataset.active = state.authors.has(author) ? 'true' : 'false';

          const avatar = document.createElement('span');
          avatar.className = 'author-avatar';
          const { color = DEFAULT_AUTHOR_COLOR, email } = AUTHOR_DETAILS[author] || {};
          avatar.dataset.color = color;
          avatar.textContent = getAuthorInitials(author) || author;

          button.appendChild(avatar);
          const tooltip = email ? `${author} · ${email}` : author;
          button.title = tooltip;
          button.setAttribute('aria-label', `Toggle filter for ${author}`);
          button.setAttribute('aria-pressed', state.authors.has(author) ? 'true' : 'false');
          button.setAttribute('data-active', state.authors.has(author) ? 'true' : 'false');

          button.addEventListener('click', () => {
            if (state.authors.has(author)) {
              state.authors.delete(author);
            } else {
              state.authors.add(author);
            }
            updateRows();
            syncFilterControls();
          });

          authorFilterList.appendChild(button);
          authorButtons.push(button);
        });
      }

      function renderStatusFilters() {
        if (!statusFilterPills) {
          return;
        }
        statusFilterPills.innerHTML = '';
        statusButtons.length = 0;

        STATUS_OPTIONS.forEach(({ value, label }) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'filter-pill';
          button.textContent = label;
          button.dataset.statusValue = value;
          button.classList.toggle('is-active', state.statuses.has(value));

          button.addEventListener('click', () => {
            if (state.statuses.has(value)) {
              state.statuses.delete(value);
            } else {
              state.statuses.add(value);
            }
            updateRows();
            syncFilterControls();
          });

          statusFilterPills.appendChild(button);
          statusButtons.push(button);
        });
      }

      function renderTypeFilters() {
        if (!typeFilterList) {
          return;
        }
        typeFilterList.innerHTML = '';
        typeButtons.length = 0;

        const types = Array.from(new Set(rowData.map((item) => item.type)))
          .filter(Boolean)
          .sort();

        types.forEach((type) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'type-chip';
          button.dataset.typeValue = type;
          button.dataset.color = TYPE_STYLES[type] || 'slate';
          button.dataset.active = state.types.has(type) ? 'true' : 'false';
          button.textContent = type;
          button.addEventListener('click', () => {
            if (state.types.has(type)) {
              state.types.delete(type);
            } else {
              state.types.add(type);
            }
            updateRows();
            syncFilterControls();
          });
          typeFilterList.appendChild(button);
          typeButtons.push(button);
        });
      }

      function renderReportFilters() {
        if (!reportFilterList) {
          return;
        }
        reportFilterList.innerHTML = '';
        reportCheckboxes.length = 0;

        REPORT_CARD_OPTIONS.forEach(({ value, label }) => {
          const wrapper = document.createElement('label');
          wrapper.className = 'report-checkbox';

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = value;
          input.checked = state.reportCards.has(value);
          input.addEventListener('change', () => {
            if (input.checked) {
              state.reportCards.add(value);
            } else {
              state.reportCards.delete(value);
            }
            updateRows();
            syncFilterControls();
          });

          const text = document.createElement('span');
          text.textContent = label;

          wrapper.append(input, text);
          reportFilterList.appendChild(wrapper);
          reportCheckboxes.push(input);
        });
      }

      function syncCreateButtonState() {
        if (!newPageSubmitButton) {
          return;
        }
        newPageSubmitButton.disabled = false;
      }

      function syncFilterControls() {
        authorButtons.forEach((button) => {
          const value = button.dataset.authorValue;
          const isActive = value ? state.authors.has(value) : false;
          button.dataset.active = isActive ? 'true' : 'false';
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        statusButtons.forEach((button) => {
          const value = button.dataset.statusValue;
          const isActive = value ? state.statuses.has(value) : false;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        typeButtons.forEach((button) => {
          const value = button.dataset.typeValue;
          const isActive = value ? state.types.has(value) : false;
          button.dataset.active = isActive ? 'true' : 'false';
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        reportCheckboxes.forEach((checkbox) => {
          checkbox.checked = state.reportCards.has(checkbox.value);
        });

        if (startDateInput) {
          startDateInput.value = state.dateStart;
        }
        if (endDateInput) {
          endDateInput.value = state.dateEnd;
        }
      }

      renderAuthorFilters();
      renderStatusFilters();
      renderTypeFilters();
      renderReportFilters();
      syncCreateButtonState();
      syncFilterControls();

      function openDrawer() {
        if (!filtersDrawer) {
          return;
        }
        filtersDrawer.setAttribute('aria-hidden', 'false');
        syncBodyScrollState();
        const firstInput = filtersDrawer.querySelector('input');
        if (firstInput) {
          firstInput.focus();
        }
      }

      function closeDrawer() {
        if (!filtersDrawer) {
          return;
        }
        filtersDrawer.setAttribute('aria-hidden', 'true');
        syncBodyScrollState();
        filtersButton?.focus();
      }

      function openDialog() {
        if (!dialog) {
          return;
        }
        dialog.setAttribute('aria-hidden', 'false');
        syncBodyScrollState();
        dialogCloseButton?.focus();
      }

      function closeDialog({ focusTrigger = true } = {}) {
        if (!dialog) {
          return;
        }
        dialog.setAttribute('aria-hidden', 'true');
        syncBodyScrollState();
        if (focusTrigger) {
          newButton?.focus();
        }
      }

      function setNewPageTemplate(value, { syncType = true } = {}) {
        if (!newPageTemplateButtons.length) {
          if (newPageTemplateInput) {
            newPageTemplateInput.value = value || '';
          }
          if (syncType && value) {
            const associatedButton = newPageTemplateButtons.find(
              (button) => button.dataset.newPageTemplateOption === value
            );
            const associatedType = associatedButton?.dataset.templateType || '';
            if (associatedType) {
              setNewPageType(associatedType, { syncTemplate: false });
            }
          }
          return;
        }

        const availableTemplates = newPageTemplateButtons
          .map((button) => button.dataset.newPageTemplateOption || '')
          .filter(Boolean);
        const recommendedTemplate =
          (newPageTypeInput?.value && TEMPLATE_DEFAULTS_BY_TYPE[newPageTypeInput.value]) ||
          '';
        const fallbackTemplate =
          (value && availableTemplates.includes(value) && value) ||
          (recommendedTemplate && availableTemplates.includes(recommendedTemplate)
            ? recommendedTemplate
            : '') ||
          (defaultNewPageTemplateValue &&
          availableTemplates.includes(defaultNewPageTemplateValue)
            ? defaultNewPageTemplateValue
            : '') ||
          availableTemplates[0] ||
          '';

        if (newPageTemplateInput) {
          newPageTemplateInput.value = fallbackTemplate;
        }

        let nextActiveIndex = -1;
        newPageTemplateButtons.forEach((button, index) => {
          const buttonValue = button.dataset.newPageTemplateOption || '';
          const isActive = Boolean(fallbackTemplate) && buttonValue === fallbackTemplate;
          button.dataset.selected = isActive ? 'true' : 'false';
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          button.tabIndex = isActive ? 0 : -1;
          if (isActive) {
            nextActiveIndex = index;
          }
        });

        activeNewPageTemplateIndex =
          nextActiveIndex >= 0 ? nextActiveIndex : Math.max(0, activeNewPageTemplateIndex);

        if (syncType) {
          const templateButton = newPageTemplateButtons[activeNewPageTemplateIndex] || null;
          const templateType = templateButton?.dataset.templateType || '';
          if (templateType) {
            setNewPageType(templateType, { syncTemplate: false });
          }
        }
      }

      function setNewPageType(value, { syncTemplate = true } = {}) {
        if (!newPageTypeButtons.length) {
          if (newPageTypeInput) {
            newPageTypeInput.value = value || '';
          }
          if (syncTemplate) {
            const recommended = TEMPLATE_DEFAULTS_BY_TYPE[value] || defaultNewPageTemplateValue || '';
            if (recommended) {
              setNewPageTemplate(recommended, { syncType: false });
            }
          }
          return;
        }

        const availableTypes = newPageTypeButtons
          .map((button) => button.dataset.newPageTypeOption || '')
          .filter(Boolean);
        const fallbackType =
          (value && availableTypes.includes(value) && value) ||
          (defaultNewPageTypeValue && availableTypes.includes(defaultNewPageTypeValue)
            ? defaultNewPageTypeValue
            : '') ||
          availableTypes[0] ||
          '';

        if (newPageTypeInput) {
          newPageTypeInput.value = fallbackType;
        }

        newPageTypeButtons.forEach((button) => {
          const buttonValue = button.dataset.newPageTypeOption || '';
          const isSelected = Boolean(fallbackType) && buttonValue === fallbackType;
          button.classList.toggle('selected', isSelected);
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });

        if (syncTemplate) {
          const templateButton = newPageTemplateButtons.find(
            (button) => button.dataset.templateType === fallbackType
          );
          const templateValue =
            templateButton?.dataset.newPageTemplateOption ||
            TEMPLATE_DEFAULTS_BY_TYPE[fallbackType] ||
            '';
          if (templateValue) {
            setNewPageTemplate(templateValue, { syncType: false });
          }
        }
      }

      function resetNewPageDialog() {
        if (newPageForm) {
          newPageSteps.forEach((section) => {
            getNewPageStepControls(section).forEach((control) => {
              control.removeAttribute('disabled');
            });
            section.removeAttribute('hidden');
            section.removeAttribute('aria-hidden');
          });
          newPageForm.reset();
        }
        const initialTypeValue =
          newPageTypeInput?.value || defaultNewPageTypeValue || '';
        setNewPageType(initialTypeValue, { syncTemplate: true });
        syncCreateButtonState();
        newPageSlugInput?.setCustomValidity('');
        newPageMetaTitleInput?.setCustomValidity('');
        newPageMetaDescriptionInput?.setCustomValidity('');
        newPageCurrentStepIndex = 0;
        if (newPageSteps.length > 0) {
          syncNewPageStepState();
        }
      }

      function openNewPageDialog() {
        if (!newPageDialog) {
          return;
        }
        resetNewPageDialog();
        newPageDialog.setAttribute('aria-hidden', 'false');
        syncBodyScrollState();
        window.requestAnimationFrame(() => {
          newPageTitleInput?.focus();
        });
      }

      function closeNewPageDialog({ focusTrigger = true } = {}) {
        if (!newPageDialog) {
          return;
        }
        newPageDialog.setAttribute('aria-hidden', 'true');
        syncBodyScrollState();
        if (focusTrigger) {
          newButton?.focus();
        }
      }

      function openCopyPageDialog(pageId, trigger) {
        if (!copyPageDialog) {
          return;
        }
        const row = pageRowById.get(pageId);
        if (!row) {
          return;
        }
        activeCopyPageId = pageId;
        lastCopyPageTrigger = trigger instanceof HTMLElement ? trigger : null;
        const title =
          row.dataset.title ||
          row.querySelector('.title-button')?.textContent?.trim() ||
          row.querySelector('.title-text')?.textContent?.trim() ||
          'this page';
        if (copyPageSourceName) {
          copyPageSourceName.textContent = title;
        }
        if (copyPageNameInput) {
          const suggestedName = title ? `${title} copy` : '';
          copyPageNameInput.value = suggestedName.trim();
          if (copyPageNameInput.value) {
            copyPageNameInput.setSelectionRange(0, copyPageNameInput.value.length);
          }
        }
        copyPageDialog.setAttribute('aria-hidden', 'false');
        syncBodyScrollState();
        window.requestAnimationFrame(() => {
          if (copyPageNameInput) {
            copyPageNameInput.focus({ preventScroll: true });
            copyPageNameInput.select();
          }
        });
      }

      function closeCopyPageDialog({ focusTrigger = true } = {}) {
        if (!copyPageDialog) {
          return;
        }
        copyPageDialog.setAttribute('aria-hidden', 'true');
        syncBodyScrollState();
        copyPageForm?.reset();
        if (copyPageSourceName) {
          copyPageSourceName.textContent = 'this page';
        }
        if (copyPageNameInput) {
          copyPageNameInput.value = '';
          copyPageNameInput.setCustomValidity('');
        }
        const trigger = lastCopyPageTrigger;
        activeCopyPageId = null;
        lastCopyPageTrigger = null;
        if (focusTrigger && trigger instanceof HTMLElement) {
          trigger.focus({ preventScroll: true });
        }
      }

      function resetFolderDialog() {
        if (folderSettingsForm) {
          folderSettingsForm.reset();
        }
        if (folderNameInput) {
          folderNameInput.value = '';
          folderNameInput.setCustomValidity('');
        }
        folderColorRadios.forEach((radio) => {
          radio.checked = false;
        });
        if (folderDialogTitle) {
          folderDialogTitle.textContent = 'Folder settings';
        }
        if (folderDialogSubmitButton) {
          folderDialogSubmitButton.textContent = 'Save changes';
        }
        folderSettingsDialog?.setAttribute('data-mode', 'edit');
      }

      function openFolderDialog(folderId = null, { trigger = null } = {}) {
        if (!folderSettingsDialog) {
          return;
        }
        resetFolderDialog();
        lastFolderDialogTrigger = trigger instanceof HTMLElement ? trigger : null;
        const folderRow = folderId ? folderRowById.get(folderId) : null;
        const isEditMode = Boolean(folderRow);
        folderDialogMode = isEditMode ? 'edit' : 'create';
        folderSettingsDialog.setAttribute('data-mode', folderDialogMode);
        if (folderDialogMode === 'edit' && folderRow) {
          activeFolderId = folderId;
          const currentName =
            folderRow.dataset.folderName ||
            folderRow.querySelector('.folder-name')?.textContent?.trim() ||
            '';
          if (folderNameInput) {
            folderNameInput.value = currentName;
          }
          const currentColor = folderRow.dataset.folderColor || DEFAULT_FOLDER_COLOR;
          folderColorRadios.forEach((radio) => {
            radio.checked = radio.value === currentColor;
          });
          if (folderDialogTitle) {
            folderDialogTitle.textContent = 'Folder settings';
          }
          if (folderDialogSubmitButton) {
            folderDialogSubmitButton.textContent = 'Save changes';
          }
        } else {
          activeFolderId = null;
          if (folderDialogTitle) {
            folderDialogTitle.textContent = 'Create folder';
          }
          if (folderDialogSubmitButton) {
            folderDialogSubmitButton.textContent = 'Create folder';
          }
          const hasPreselectedColor = Array.from(folderColorRadios).some(
            (radio) => radio.checked
          );
          if (!hasPreselectedColor) {
            const defaultRadio = Array.from(folderColorRadios).find(
              (radio) => radio.value === DEFAULT_FOLDER_COLOR
            );
            if (defaultRadio) {
              defaultRadio.checked = true;
            } else if (folderColorRadios[0]) {
              folderColorRadios[0].checked = true;
            }
          }
        }
        folderSettingsDialog.setAttribute('aria-hidden', 'false');
        syncBodyScrollState();
        window.requestAnimationFrame(() => {
          if (folderNameInput) {
            folderNameInput.focus({ preventScroll: true });
            folderNameInput.select();
          }
        });
      }

      function closeFolderDialog({ focusTrigger = true } = {}) {
        if (!folderSettingsDialog) {
          return;
        }
        folderSettingsDialog.setAttribute('aria-hidden', 'true');
        syncBodyScrollState();
        activeFolderId = null;
        folderDialogMode = 'edit';
        const trigger = lastFolderDialogTrigger;
        lastFolderDialogTrigger = null;
        resetFolderDialog();
        if (focusTrigger && trigger instanceof HTMLElement) {
          trigger.focus({ preventScroll: true });
        }
      }

      function clearSelection() {
        Array.from(selection).forEach((pageId) => {
          const row = pageRowById.get(pageId);
          if (row) {
            setPageSelection(row, false);
          }
        });
        updateMasterCheckbox();
        updateFolderCheckboxes();
        updateBulkBar();
      }

      if (searchInput) {
        searchInput.addEventListener('input', (event) => {
          const rawValue = event.target.value.trim();
          if (rawValue.length >= 3) {
            state.search = rawValue.toLowerCase();
            state.searchRaw = rawValue;
          } else {
            state.search = '';
            state.searchRaw = '';
          }
          updateRows();
        });

        searchInput.addEventListener('focus', () => {
          document.body.classList.add('search-mode');
        });

        searchInput.addEventListener('blur', () => {
          window.requestAnimationFrame(() => {
            if (document.activeElement !== searchInput) {
              document.body.classList.remove('search-mode');
            }
          });
        });
      }

      if (searchOverlay) {
        searchOverlay.addEventListener('click', () => {
          searchInput?.blur();
        });
      }

      document.addEventListener('keydown', (event) => {
        const target = event.target;
        const isTypingTarget =
          target instanceof HTMLElement &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable);

        if ((event.metaKey || event.ctrlKey) && event.key === '/') {
          event.preventDefault();
          focusSearchInput();
          return;
        }

        if (
          event.key === '/' &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey &&
          !isTypingTarget
        ) {
          event.preventDefault();
          focusSearchInput();
          return;
        }
        if (event.key === 'Escape') {
          for (const controller of actionDialogControllers) {
            if (controller?.isOpen && controller.isOpen()) {
              event.preventDefault();
              controller.close();
              return;
            }
          }
          if (filtersDrawer?.getAttribute('aria-hidden') === 'false') {
            event.preventDefault();
            closeDrawer();
            return;
          }
          if (newPageDialog?.getAttribute('aria-hidden') === 'false') {
            event.preventDefault();
            closeNewPageDialog();
            return;
          }
          if (copyPageDialog?.getAttribute('aria-hidden') === 'false') {
            event.preventDefault();
            closeCopyPageDialog();
            return;
          }
          if (dialog?.getAttribute('aria-hidden') === 'false') {
            event.preventDefault();
            closeDialog();
            return;
          }
          if (folderSettingsDialog?.getAttribute('aria-hidden') === 'false') {
            event.preventDefault();
            closeFolderDialog();
          }
          if (pageSettingsDialog?.getAttribute('aria-hidden') === 'false') {
            event.preventDefault();
            closePageSettingsDialog();
          }
          closeAllActionMenus();
        }
      });

      if (filterChips) {
        filterChips.addEventListener('click', (event) => {
          const target = event.target.closest('.chip-button');
          if (!target) {
            return;
          }
          const chipType = target.dataset.chipType;
          if (!chipType) {
            return;
          }
          const chipValue = target.dataset.chipValue || '';

          if (chipType === 'search') {
            if (searchInput) {
              searchInput.value = '';
            }
            state.search = '';
            state.searchRaw = '';
          } else if (chipType === 'author') {
            state.authors.delete(chipValue);
          } else if (chipType === 'type') {
            state.types.delete(chipValue);
          } else if (chipType === 'status') {
            state.statuses.delete(chipValue);
          } else if (chipType === 'report') {
            state.reportCards.delete(chipValue);
          } else if (chipType === 'date') {
            state.dateStart = '';
            state.dateEnd = '';
          }

          syncFilterControls();
          updateRows();
        });
      }

      tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const status = button.dataset.statusTab;
          if (!status || status === state.status) {
            return;
          }

          state.status = status;

          tabButtons.forEach((tab) => {
            const isActive = tab === button;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
          });

          updateRows();
        });
      });

      if (filtersButton) {
        filtersButton.addEventListener('click', () => {
          if (filtersDrawer?.getAttribute('aria-hidden') === 'false') {
            closeDrawer();
          } else {
            openDrawer();
          }
        });
      }

      drawerCloseButton?.addEventListener('click', closeDrawer);

      filtersDrawer?.addEventListener('click', (event) => {
        if (event.target === filtersDrawer) {
          closeDrawer();
        }
      });

      if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = '';
          }
          state.search = '';
          state.searchRaw = '';
          state.authors.clear();
          state.types.clear();
          state.statuses.clear();
          state.reportCards.clear();
          state.dateStart = '';
          state.dateEnd = '';
          syncFilterControls();
          updateRows();
        });
      }

      startDateInput?.addEventListener('change', () => {
        state.dateStart = startDateInput.value;
        updateRows();
        syncFilterControls();
      });

      endDateInput?.addEventListener('change', () => {
        state.dateEnd = endDateInput.value;
        updateRows();
        syncFilterControls();
      });

      applyFiltersButton?.addEventListener('click', () => {
        closeDrawer();
      });

      newButton?.addEventListener('click', openDialog);
      dialogCloseButton?.addEventListener('click', closeDialog);

      dialog?.addEventListener('click', (event) => {
        if (event.target === dialog) {
          closeDialog();
        }
      });

      optionButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const action = button.dataset.action;
          if (action === 'page') {
            closeDialog({ focusTrigger: false });
            window.requestAnimationFrame(() => {
              openNewPageDialog();
            });
            return;
          }
          if (action === 'folder') {
            closeDialog({ focusTrigger: false });
            window.requestAnimationFrame(() => {
              openFolderDialog(null, { trigger: newButton });
            });
            return;
          }
          closeDialog();
          if (action) {
            console.log(`Create new ${action}`);
          }
        });
      });

      newPageDialogCloseButton?.addEventListener('click', () => {
        closeNewPageDialog();
      });

      newPageDialog?.addEventListener('click', (event) => {
        if (event.target === newPageDialog) {
          closeNewPageDialog();
        }
      });

      copyPageDialogClose?.addEventListener('click', () => {
        closeCopyPageDialog();
      });

      copyPageCancelButton?.addEventListener('click', () => {
        closeCopyPageDialog();
      });

      copyPageDialog?.addEventListener('click', (event) => {
        if (event.target === copyPageDialog) {
          closeCopyPageDialog();
        }
      });

      copyPageForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!copyPageForm.reportValidity()) {
          return;
        }
        if (!activeCopyPageId) {
          closeCopyPageDialog();
          return;
        }
        const formData = new FormData(copyPageForm);
        const newTitle = (formData.get('copyPageName') || '').toString().trim();
        console.log('Duplicate page', { sourcePageId: activeCopyPageId, title: newTitle });
        closeCopyPageDialog();
      });

      function getNewPageStepControls(section) {
        if (!section) {
          return [];
        }
        return Array.from(section.querySelectorAll('input, select, textarea'));
      }

      function syncNewPageStepState() {
        if (newPageSteps.length === 0) {
          return;
        }
        newPageSteps.forEach((section, index) => {
          const isActive = index === newPageCurrentStepIndex;
          section.toggleAttribute('hidden', !isActive);
          section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
          section.setAttribute('tabindex', isActive ? '0' : '-1');
          getNewPageStepControls(section).forEach((control) => {
            if (control instanceof HTMLInputElement && control.type === 'hidden') {
              return;
            }
            if (isActive) {
              control.removeAttribute('disabled');
            } else {
              control.setAttribute('disabled', 'true');
            }
          });
        });
        if (newPageStepTabs.length > 0) {
          newPageStepTabs.forEach((tab, index) => {
            const isActive = index === newPageCurrentStepIndex;
            const isComplete = index < newPageCurrentStepIndex;
            tab.classList.toggle('is-active', isActive);
            tab.classList.toggle('is-complete', isComplete);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
          });
        }
        if (newPageNextButton) {
          newPageNextButton.toggleAttribute(
            'hidden',
            newPageCurrentStepIndex >= newPageSteps.length - 1
          );
        }
        if (newPageSubmitButton) {
          newPageSubmitButton.toggleAttribute(
            'hidden',
            newPageCurrentStepIndex < newPageSteps.length - 1
          );
        }
        syncCreateButtonState();
      }

      function focusNewPageStep(section) {
        if (!section) {
          return;
        }
        const focusTarget = section.querySelector(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        if (focusTarget instanceof HTMLElement) {
          focusTarget.focus();
          return;
        }
        if (section instanceof HTMLElement) {
          section.focus();
        }
      }

      function setNewPageStep(index, { focusStep = true } = {}) {
        if (newPageSteps.length === 0) {
          return;
        }
        const clampedIndex = Math.max(0, Math.min(index, newPageSteps.length - 1));
        newPageCurrentStepIndex = clampedIndex;
        syncNewPageStepState();
        if (focusStep) {
          window.requestAnimationFrame(() => {
            focusNewPageStep(newPageSteps[newPageCurrentStepIndex]);
          });
        }
      }

      function handleNewPageStepTabChange(targetIndex, { fromKeyboard = false } = {}) {
        if (newPageSteps.length === 0) {
          return;
        }
        if (targetIndex < 0 || targetIndex >= newPageSteps.length) {
          return;
        }
        if (targetIndex > newPageCurrentStepIndex + 1) {
          return;
        }
        if (targetIndex === newPageCurrentStepIndex + 1 && !validateNewPageStep()) {
          return;
        }
        setNewPageStep(targetIndex, { focusStep: !fromKeyboard });
        if (fromKeyboard) {
          const targetTab = newPageStepTabs[targetIndex];
          if (targetTab) {
            targetTab.focus();
          }
        }
      }

      function validateNewPageStep(stepIndex = newPageCurrentStepIndex) {
        const section = newPageSteps[stepIndex];
        if (!section) {
          return true;
        }
        if (section.dataset.step === 'seo') {
          if (newPageSlugInput) {
            const slugValue = newPageSlugInput.value.trim();
            if (!slugValue) {
              newPageSlugInput.setCustomValidity('Please enter a slug.');
            } else if (!/^[a-z0-9-]+$/.test(slugValue)) {
              newPageSlugInput.setCustomValidity(
                'Slug can only contain lowercase letters, numbers, and hyphens.'
              );
            } else {
              newPageSlugInput.value = slugValue;
              newPageSlugInput.setCustomValidity('');
            }
          }
          if (newPageMetaTitleInput) {
            const metaTitleValue = newPageMetaTitleInput.value.trim();
            if (!metaTitleValue) {
              newPageMetaTitleInput.setCustomValidity('Please enter a meta title.');
            } else {
              newPageMetaTitleInput.value = metaTitleValue;
              newPageMetaTitleInput.setCustomValidity('');
            }
          }
          if (newPageMetaDescriptionInput) {
            const descriptionValue = newPageMetaDescriptionInput.value.trim();
            if (!descriptionValue) {
              newPageMetaDescriptionInput.setCustomValidity('Please enter a meta description.');
            } else if (descriptionValue.length > 160) {
              newPageMetaDescriptionInput.setCustomValidity(
                'Meta description must be 160 characters or fewer.'
              );
            } else {
              newPageMetaDescriptionInput.value = descriptionValue;
              newPageMetaDescriptionInput.setCustomValidity('');
            }
          }
        }
        let isValid = true;
        getNewPageStepControls(section)
          .filter((control) => !control.disabled)
          .forEach((control) => {
            if (!control.checkValidity()) {
              if (isValid) {
                control.reportValidity();
              }
              isValid = false;
            }
          });
        syncCreateButtonState();
        return isValid;
      }

      if (newPageSteps.length > 0) {
        syncNewPageStepState();
      }

      newPageStepTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
          handleNewPageStepTabChange(index);
        });
        tab.addEventListener('keydown', (event) => {
          const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
          if (!keys.includes(event.key)) {
            return;
          }
          event.preventDefault();
          let targetIndex = index;
          if (event.key === 'ArrowRight') {
            targetIndex = (index + 1) % newPageStepTabs.length;
          } else if (event.key === 'ArrowLeft') {
            targetIndex = (index - 1 + newPageStepTabs.length) % newPageStepTabs.length;
          } else if (event.key === 'Home') {
            targetIndex = 0;
          } else if (event.key === 'End') {
            targetIndex = newPageStepTabs.length - 1;
          }
          handleNewPageStepTabChange(targetIndex, { fromKeyboard: true });
        });
      });

      newPageNextButton?.addEventListener('click', () => {
        if (!validateNewPageStep()) {
          return;
        }
        setNewPageStep(newPageCurrentStepIndex + 1);
      });

      newPageCancelButton?.addEventListener('click', () => {
        closeNewPageDialog();
      });

      newPageTypeButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
          setNewPageType(button.dataset.newPageTypeOption || '', { syncTemplate: true });
        });
        button.addEventListener('keydown', (event) => {
          const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
          if (!keys.includes(event.key)) {
            return;
          }
          event.preventDefault();
          let targetIndex = index;
          const total = newPageTypeButtons.length;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            targetIndex = (index + 1) % total;
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            targetIndex = (index - 1 + total) % total;
          } else if (event.key === 'Home') {
            targetIndex = 0;
          } else if (event.key === 'End') {
            targetIndex = total - 1;
          }
          const targetButton = newPageTypeButtons[targetIndex];
          if (targetButton) {
            setNewPageType(targetButton.dataset.newPageTypeOption || '', { syncTemplate: true });
            targetButton.focus({ preventScroll: true });
          }
        });
      });

      newPageTemplateButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
          setNewPageTemplate(button.dataset.newPageTemplateOption || '', { syncType: true });
        });
        button.addEventListener('keydown', (event) => {
          const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
          if (!keys.includes(event.key)) {
            return;
          }
          event.preventDefault();
          let targetIndex = index;
          if (event.key === 'ArrowRight') {
            targetIndex = (index + 1) % newPageTemplateButtons.length;
          } else if (event.key === 'ArrowLeft') {
            targetIndex =
              (index - 1 + newPageTemplateButtons.length) % newPageTemplateButtons.length;
          } else if (event.key === 'Home') {
            targetIndex = 0;
          } else if (event.key === 'End') {
            targetIndex = newPageTemplateButtons.length - 1;
          }
          const targetButton = newPageTemplateButtons[targetIndex];
          if (targetButton) {
            setNewPageTemplate(targetButton.dataset.newPageTemplateOption || '', {
              syncType: true,
            });
            targetButton.focus({ preventScroll: true });
          }
        });
      });

      if (newPageTypeButtons.length || newPageTypeInput) {
        const initialType = newPageTypeInput?.value || defaultNewPageTypeValue || '';
        setNewPageType(initialType, { syncTemplate: true });
      } else if (newPageTemplateButtons.length) {
        const initialTemplate =
          newPageTemplateInput?.value || defaultNewPageTemplateValue || '';
        setNewPageTemplate(initialTemplate, { syncType: true });
      }

      newPageSlugInput?.addEventListener('input', () => {
        newPageSlugInput.setCustomValidity('');
      });

      newPageMetaTitleInput?.addEventListener('input', () => {
        newPageMetaTitleInput.setCustomValidity('');
      });

      newPageMetaDescriptionInput?.addEventListener('input', () => {
        newPageMetaDescriptionInput.setCustomValidity('');
      });

      newPageForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!validateNewPageStep()) {
          return;
        }
        const restoredControls = [];
        newPageSteps.forEach((section) => {
          getNewPageStepControls(section).forEach((control) => {
            if (
              control.disabled &&
              !(control instanceof HTMLInputElement && control.type === 'hidden')
            ) {
              restoredControls.push(control);
              control.removeAttribute('disabled');
            }
          });
        });
        if (!newPageForm.checkValidity()) {
          newPageForm.reportValidity();
          restoredControls.forEach((control) => {
            control.setAttribute('disabled', 'true');
          });
          return;
        }
        const formData = new FormData(newPageForm);
        restoredControls.forEach((control) => {
          control.setAttribute('disabled', 'true');
        });
        const socialImage = formData.get('socialImage');
        const normalizedSocialImage =
          socialImage instanceof File && socialImage.name ? socialImage : null;
        const statusValue = (formData.get('status') || '').toString().trim() || 'draft';
        const scheduleDate = (formData.get('scheduleDate') || '').toString().trim();
        const scheduleTime = (formData.get('scheduleTime') || '').toString().trim();
        const scheduleAt =
          statusValue === 'scheduled' && scheduleDate && scheduleTime
            ? `${scheduleDate}T${scheduleTime}`
            : null;
        const payload = {
          title: (formData.get('title') || '').toString().trim(),
          folder: (formData.get('folder') || '').toString().trim(),
          type: (formData.get('type') || '').toString().trim(),
          status: statusValue,
          scheduleAt,
          metadata: {
            slug: (formData.get('slug') || '').toString().trim(),
            metaTitle: (formData.get('metaTitle') || '').toString().trim(),
            metaDescription: (formData.get('metaDescription') || '').toString().trim(),
            socialImage: normalizedSocialImage,
          },
        };
        console.log('Create new page', payload);
        closeNewPageDialog();
      });

      folderDialogClose?.addEventListener('click', () => {
        closeFolderDialog();
      });
      folderDialogCancel?.addEventListener('click', () => {
        closeFolderDialog();
      });
      folderSettingsDialog?.addEventListener('click', (event) => {
        if (event.target === folderSettingsDialog) {
          closeFolderDialog();
        }
      });

      folderNameInput?.addEventListener('input', () => {
        folderNameInput.setCustomValidity('');
      });

      folderSettingsForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!folderSettingsForm?.reportValidity()) {
          return;
        }
        const trimmedName = folderNameInput?.value.trim() || '';
        if (!trimmedName) {
          if (folderNameInput) {
            folderNameInput.value = '';
            folderNameInput.setCustomValidity('Please enter a folder name.');
            folderNameInput.reportValidity();
          }
          return;
        }
        if (folderNameInput) {
          folderNameInput.value = trimmedName;
          folderNameInput.setCustomValidity('');
        }
        const selectedColor =
          Array.from(folderColorRadios).find((radio) => radio.checked)?.value || DEFAULT_FOLDER_COLOR;
        if (folderDialogMode === 'create' || !activeFolderId) {
          console.log('Create folder', {
            name: trimmedName,
            color: selectedColor,
          });
          closeFolderDialog();
          return;
        }
        const folderRow = folderRowById.get(activeFolderId);
        if (!folderRow) {
          closeFolderDialog();
          return;
        }
        const nameElement = folderRow.querySelector('.folder-name');
        if (nameElement) {
          nameElement.textContent = trimmedName;
        }
        folderRow.dataset.folderName = trimmedName;
        const folderCheckbox = folderRow.querySelector('[data-folder-checkbox]');
        folderCheckbox?.setAttribute('aria-label', `Select folder ${trimmedName}`);
        const actionsGroup = folderRow.querySelector('.folder-actions');
        actionsGroup?.setAttribute('aria-label', `${trimmedName} folder actions`);
        const folderOption = folderOptions.find((option) => option.value === activeFolderId);
        if (folderOption) {
          folderOption.label = trimmedName;
          populatePageSettingsControls();
        }
        if (selectedColor) {
          const icon = folderRow.querySelector('.folder-icon');
          if (icon) {
            icon.setAttribute('data-color', selectedColor);
          }
          folderRow.dataset.folderColor = selectedColor;
        }
        console.log('Update folder', {
          folderId: activeFolderId,
          name: trimmedName,
          color: selectedColor,
        });
        closeFolderDialog();
      });

      moveFolderDestinationSelect?.addEventListener('change', () => {
        moveFolderDestinationSelect.setCustomValidity('');
      });

      deleteFolderConfirmInput?.addEventListener('input', () => {
        deleteFolderConfirmInput.setCustomValidity('');
      });

      emptyTrashConfirmInput?.addEventListener('input', () => {
        emptyTrashConfirmInput.setCustomValidity('');
      });

      pageSettingsTabButtons.forEach((button) => {
        button.addEventListener('click', () => {
          setActivePageSettingsTab(button.dataset.pageSettingsTab);
        });
        button.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            focusAdjacentPageSettingsTab(1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            focusAdjacentPageSettingsTab(-1);
          } else if (event.key === 'Home') {
            event.preventDefault();
            const firstTab = pageSettingsTabButtons[0]?.dataset.pageSettingsTab;
            if (firstTab) {
              setActivePageSettingsTab(firstTab, { focusTab: true });
            }
          } else if (event.key === 'End') {
            event.preventDefault();
            const lastTab =
              pageSettingsTabButtons[pageSettingsTabButtons.length - 1]?.dataset
                .pageSettingsTab;
            if (lastTab) {
              setActivePageSettingsTab(lastTab, { focusTab: true });
            }
          }
        });
      });

      pageSettingsTypeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const nextType = button.dataset.pageTypeOption || '';
          setPageSettingsType(nextType);
          const recommendedTemplate =
            TEMPLATE_DEFAULTS_BY_TYPE[nextType] || defaultPageTemplateValue;
          if (recommendedTemplate) {
            setPageSettingsTemplate(recommendedTemplate);
          }
        });
      });

      pageSettingsTemplateButtons.forEach((button) => {
        button.addEventListener('click', () => {
          setPageSettingsTemplate(button.dataset.pageTemplateOption || '');
        });
      });

      pageSettingsDialogClose?.addEventListener('click', () => {
        closePageSettingsDialog();
      });

      pageSettingsCancel?.addEventListener('click', () => {
        closePageSettingsDialog();
      });

      pageSettingsDialog?.addEventListener('click', (event) => {
        if (event.target === pageSettingsDialog) {
          closePageSettingsDialog();
        }
      });

      pageSettingsForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!activePageId) {
          closePageSettingsDialog();
          return;
        }
        const formData = new FormData(pageSettingsForm);
        const titleValue = (formData.get('title') || '').toString().trim();
        const slugValue = (formData.get('slug') || '').toString().trim();
        const typeValue = (formData.get('type') || '').toString().trim();
        const templateValue = (formData.get('template') || '').toString().trim();
        const normalizedType = typeValue || defaultPageTypeValue;
        const resolvedTemplate =
          templateValue || TEMPLATE_DEFAULTS_BY_TYPE[normalizedType] || defaultPageTemplateValue;
        const payload = {
          pageId: activePageId,
          title: titleValue,
          slug: slugValue,
          folder: (formData.get('folder') || '').toString().trim(),
          status: (formData.get('status') || '').toString().trim(),
          author: (formData.get('author') || '').toString().trim(),
          description: (formData.get('description') || '').toString().trim(),
          type: normalizedType,
          template: resolvedTemplate,
        };
        const row = pageRowById.get(activePageId);
        if (row) {
          if (titleValue) {
            row.dataset.title = titleValue;
            const titleButton = row.querySelector('.title-button');
            if (titleButton) {
              titleButton.textContent = titleValue;
            }
          }
          if (slugValue) {
            const subtitle = row.querySelector('.title-text .subtitle');
            if (subtitle) {
              subtitle.textContent = slugValue;
            }
          }
          if (normalizedType) {
            row.dataset.type = normalizedType;
          }
          if (resolvedTemplate) {
            row.dataset.template = resolvedTemplate;
          }
          const typeChip = row.querySelector('.chip');
          if (typeChip) {
            typeChip.textContent = normalizedType || '—';
            typeChip.dataset.color = TYPE_STYLES[normalizedType] || 'slate';
          }
        }
        const rowEntry = rowData.find((item) => item.pageId === activePageId);
        if (rowEntry) {
          rowEntry.title = titleValue || rowEntry.title;
          rowEntry.slug = slugValue || rowEntry.slug;
          rowEntry.type = normalizedType || rowEntry.type;
          rowEntry.template = resolvedTemplate || rowEntry.template;
          const sourceBits = [
            rowEntry.title,
            rowEntry.slug,
            rowEntry.status,
            rowEntry.type,
            rowEntry.author,
            rowEntry.template,
            row?.textContent || '',
          ];
          rowEntry.searchText = sourceBits
            .join(' ')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
        }
        applyRowVisualStyles();
        renderTypeFilters();
        syncFilterControls();
        updateRows();
        console.log('Update page settings', payload);
        closePageSettingsDialog();
      });

      pageRows.forEach((row) => {
        const checkbox = row.querySelector('[data-row-checkbox]');
        if (!checkbox) {
          return;
        }
        checkbox.addEventListener('change', () => {
          setPageSelection(row, checkbox.checked);
          updateMasterCheckbox();
          updateFolderCheckboxes();
          updateBulkBar();
        });
      });

      masterCheckbox?.addEventListener('change', () => {
        if (!masterCheckbox) {
          return;
        }
        const scopeRows = getRowsInScope();
        scopeRows.forEach((row) => {
          setPageSelection(row, masterCheckbox.checked);
        });
        updateMasterCheckbox();
        updateFolderCheckboxes();
        updateBulkBar();
      });

      folderCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          const folderId = checkbox.dataset.folderId || '_root';
          const members = folderMembers.get(folderId) || [];
          const scopedMembers = members.filter((row) => !row.classList.contains('is-filter-hidden'));
          if (scopedMembers.length === 0) {
            checkbox.checked = false;
            checkbox.indeterminate = false;
            return;
          }
          scopedMembers.forEach((row) => {
            setPageSelection(row, checkbox.checked);
          });
          updateMasterCheckbox();
          updateFolderCheckboxes();
          updateBulkBar();
        });
      });

      actionMenus.forEach((menu) => {
        const trigger = menu.querySelector('[data-action-menu-trigger]');
        const dropdown = menu.querySelector('[data-action-menu-dropdown]');
        if (!trigger || !dropdown) {
          return;
        }
        closeActionMenu(menu);
        trigger.addEventListener('click', (event) => {
          event.stopPropagation();
          const isOpen = menu.dataset.open === 'true';
          if (isOpen) {
            closeActionMenu(menu);
          } else {
            openActionMenu(menu);
          }
        });
        trigger.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            closeActionMenu(menu);
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const isOpen = menu.dataset.open === 'true';
            if (isOpen) {
              closeActionMenu(menu);
            } else {
              openActionMenu(menu);
            }
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openActionMenu(menu);
            dropdown.querySelector('[data-menu-action]')?.focus({ preventScroll: true });
          }
        });
        dropdown.addEventListener('click', (event) => {
          event.stopPropagation();
        });
        dropdown.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeActionMenu(menu, { focusTrigger: true });
          }
        });
      });

      clearSelectionButton?.addEventListener('click', clearSelection);

      bulkActionButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const action = button.dataset.bulkAction;
          if (!action || selection.size === 0) {
            return;
          }
          console.log(`Bulk ${action}`, Array.from(selection));
        });
      });

      window.addEventListener('resize', syncBulkBarOffset);

      sortButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const key = button.dataset.sortKey;
          if (!key) {
            return;
          }
          if (state.sortKey === key) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = key;
            state.sortDirection =
              key === 'type' || key === 'author' || key === 'title' ? 'asc' : 'desc';
          }
          applySort();
          updateSortIndicators();
        });
      });

      folderToggleButtons.forEach((button) => {
        const folderId = button.dataset.folderToggle;
        button.addEventListener('click', (event) => {
          event.preventDefault();
          if (isFlatView) {
            return;
          }
          const isExpanded = button.getAttribute('aria-expanded') === 'true';
          setFolderExpanded(folderId, !isExpanded);
        });
        button.addEventListener('dblclick', (event) => {
          event.preventDefault();
          if (isFlatView) {
            return;
          }
          event.stopPropagation();
          openFolderDialog(folderId, { trigger: button });
        });
      });

      flatViewToggleButton?.addEventListener('click', (event) => {
        event.preventDefault();
        isFlatView = !isFlatView;
        applyFlatViewState();
      });

      folderViewToggleButton?.addEventListener('click', (event) => {
        event.preventDefault();
        if (isFlatView) {
          return;
        }
        const availableToggles = folderToggleButtons.filter((button) => button.dataset.folderToggle);
        const shouldExpand = availableToggles.some(
          (toggleButton) => toggleButton.getAttribute('aria-expanded') !== 'true'
        );
        availableToggles.forEach((toggleButton) => {
          const folderId = toggleButton.dataset.folderToggle;
          if (folderId) {
            setFolderExpanded(folderId, shouldExpand);
          }
        });
      });

      applyFlatViewState({ persist: false });

      updateFolderViewToggleButtonState();

      document.addEventListener('click', (event) => {
        const menuElement = event.target.closest('[data-action-menu]');
        if (!menuElement) {
          closeAllActionMenus();
        }
        const pageSettingsTrigger = event.target.closest('[data-page-settings]');
        if (pageSettingsTrigger) {
          const row = pageSettingsTrigger.closest('.page-row');
          const pageId = row?.dataset.pageId;
          if (pageId) {
            openPageSettingsDialog(pageId, pageSettingsTrigger);
          }
          return;
        }

        const actionMenuItem = event.target.closest('[data-menu-action]');
        if (actionMenuItem) {
          const action = actionMenuItem.dataset.menuAction;
          const row = actionMenuItem.closest('.page-row');
          const pageId = row?.dataset.pageId;
          if (action === 'settings' && pageId) {
            const triggerButton = menuElement?.querySelector('[data-action-menu-trigger]');
            openPageSettingsDialog(pageId, triggerButton || actionMenuItem);
          } else if (action === 'duplicate' && pageId) {
            const triggerButton = menuElement?.querySelector('[data-action-menu-trigger]');
            openCopyPageDialog(pageId, triggerButton || actionMenuItem);
          } else if (action && pageId) {
            const controller = actionDialogs[action];
            if (controller) {
              if (menuElement) {
                closeActionMenu(menuElement);
              }
              controller.open(pageId, { trigger: actionMenuItem });
              return;
            }
            console.log(`Page ${action}`, pageId);
          } else if (action) {
            console.log(`Page ${action}`, pageId);
          }
          if (menuElement) {
            closeActionMenu(menuElement);
          }
        }
        const titleButton = event.target.closest('[data-open-page]');
        if (titleButton) {
          const pageId = titleButton.dataset.openPage;
          console.log('Open page editor for', pageId);
        }
        const statusButton = event.target.closest('[data-status-action]');
        if (statusButton) {
          const statusValue = statusButton.dataset.statusAction;
          const row = statusButton.closest('.page-row');
          console.log('Open publish settings for', row?.dataset.pageId, statusValue);
        }
        const authorButton = event.target.closest('[data-author-filter]');
        if (authorButton) {
          if (state.authors.size > 0) {
            state.authors.clear();
            syncFilterControls();
            updateRows();
          }
        }
        const reportButton = event.target.closest('[data-report-drawer]');
        if (reportButton) {
          const pageId = reportButton.dataset.reportDrawer;
          console.log('Open analytics for', pageId);
        }
        const folderActionButton = event.target.closest('[data-folder-action]');
        if (folderActionButton) {
          const action = folderActionButton.dataset.folderAction;
          const folderRow = folderActionButton.closest('.group-row');
          const folderId = folderRow?.dataset.folder;
          if (action === 'rename' && folderId) {
            const triggerButton =
              menuElement?.querySelector('[data-action-menu-trigger]') || folderActionButton;
            openFolderDialog(folderId, { trigger: triggerButton });
          } else if (action && folderId) {
            const controller = folderActionDialogs[action];
            if (controller) {
              const triggerButton =
                menuElement?.querySelector('[data-action-menu-trigger]') || folderActionButton;
              controller.open(folderId, { trigger: triggerButton });
            } else {
              console.log(`Folder ${action}`, folderId);
            }
          }
        }
      });

      const initialise = () => {
        applySort();
        updateSortIndicators();
        updateRows();
        syncFilterControls();
        syncBodyScrollState();
        syncBulkBarOffset();
      };

      initialise();
    } catch (error) {
      console.error('Failed to initialize Pages interface', error);
    }
  })();

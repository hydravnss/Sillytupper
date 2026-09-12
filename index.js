import { extension_settings } from '../../../extensions.js';
import { setUserAvatar } from '../../../personas.js';
import { power_user } from '../../../power-user.js';
import { sendTextareaMessage } from '../../../../script.js';

const extensionName = 'SillyTupper';
let isProcessing = false;

/* =========================================================
   SETTINGS
   ========================================================= */
function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = {
            enabled: true,
            tuppers: []
        };
    }
    if (typeof extension_settings[extensionName].enabled !== 'boolean') {
        extension_settings[extensionName].enabled = true;
    }
    if (!Array.isArray(extension_settings[extensionName].tuppers)) {
        extension_settings[extensionName].tuppers = [];
    }
}

function saveSettings() {
    if (typeof saveSettingsDebounced === 'function') {
        saveSettingsDebounced();
    }
}

/* =========================================================
   PERSONAS
   ========================================================= */
function getPersonas() {
    const personas = power_user?.personas;
    if (!personas || typeof personas !== 'object') return [];
    return Object.entries(personas).map(([avatarId, name]) => ({
        avatarId,
        name: String(name).trim()
    }));
}

/* =========================================================
   TUPPER SEARCH
   ========================================================= */
function normalizeTrigger(trigger) {
    return String(trigger || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function findTupperByTrigger(trigger) {
    const search = normalizeTrigger(trigger);
    if (!search) return null;

    return extension_settings[extensionName].tuppers.find(tupper => {
        if (tupper.enabled === false) return false;
        return normalizeTrigger(tupper.trigger) === search;
    }) || null;
}

/* =========================================================
   PARSE MESSAGE
   ========================================================= */
function parseTupperMessage(text) {
    if (!text) return null;

    const match = text.match(/^([^:\n]{1,100}):\s*([\s\S]*)$/);
    if (!match) return null;

    const trigger = match[1].trim();
    const message = match[2].trim();

    if (!trigger || !message) return null;
    return { trigger, message };
}

/* =========================================================
   PROCESS TUPPER (version renforcée PC)
   ========================================================= */
async function processTupperMessage() {
    if (isProcessing) {
        console.log('[SillyTupper] Déjà en cours de traitement, ignore.');
        return false;
    }

    if (!extension_settings[extensionName]?.enabled) return false;

    const textarea = document.getElementById('send_textarea');
    if (!textarea) return false;

    const originalText = textarea.value;
    const parsed = parseTupperMessage(originalText);

    if (!parsed) return false;

    const tupper = findTupperByTrigger(parsed.trigger);

    if (!tupper) {
        console.log(`[SillyTupper] Aucun Tupper pour : "${parsed.trigger}"`);
        return false;
    }

    isProcessing = true;

    try {
        console.log(`[SillyTupper] → Trigger "${parsed.trigger}" | Persona : "${tupper.personaName}"`);

        // 1. Change la persona
        await setUserAvatar(tupper.avatarId, {
            toastPersonaNameChange: false
        });

        // 2. Retire le trigger
        textarea.value = parsed.message;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        // 3. Délai plus long et plus fiable (surtout utile sur PC)
        await new Promise(resolve => setTimeout(resolve, 80));

        // 4. Envoi
        await sendTextareaMessage();

        console.log(`[SillyTupper] Message envoyé sous : ${tupper.personaName}`);
        return true;

    } catch (error) {
        console.error('[SillyTupper] Erreur :', error);
        textarea.value = originalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return false;

    } finally {
        // Petit délai avant de réautoriser un nouvel envoi (évite les doubles)
        setTimeout(() => {
            isProcessing = false;
        }, 150);
    }
}

/* =========================================================
   INTERCEPTION ENTER (renforcée)
   ========================================================= */
function setupKeyboardListener() {
    document.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
        if (isProcessing) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        const textarea = document.getElementById('send_textarea');
        if (!textarea || event.target !== textarea) return;

        const parsed = parseTupperMessage(textarea.value.trim());
        if (!parsed) return;

        const tupper = findTupperByTrigger(parsed.trigger);
        if (!tupper) return;

        // Bloque complètement l'événement original
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        await processTupperMessage();
    }, true); // capture = true
}

/* =========================================================
   INTERCEPTION BOUTON ENVOYER (renforcée)
   ========================================================= */
function setupSendButtonListener() {
    document.addEventListener('click', async (event) => {
        if (isProcessing) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        const button = event.target.closest('#send_but');
        if (!button) return;

        const textarea = document.getElementById('send_textarea');
        if (!textarea) return;

        const parsed = parseTupperMessage(textarea.value.trim());
        if (!parsed) return;

        const tupper = findTupperByTrigger(parsed.trigger);
        if (!tupper) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        await processTupperMessage();
    }, true);
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* =========================================================
   RENDER TUPPER LIST
   ========================================================= */
function renderTupperList() {
    const list = document.getElementById('sillytupper-list');
    if (!list) return;

    list.innerHTML = '';
    const tuppers = extension_settings[extensionName].tuppers;

    if (!tuppers.length) {
        list.innerHTML = `
            <div class="sillytupper-empty">
                Aucun Tupper configuré.<br>
                Clique sur « Ajouter un Tupper ».
            </div>
        `;
        return;
    }

    for (const tupper of tuppers) {
        const item = document.createElement('div');
        item.className = 'sillytupper-item';
        if (tupper.enabled === false) {
            item.classList.add('sillytupper-disabled');
        }

        item.innerHTML = `
            <div class="sillytupper-item-info">
                <div class="sillytupper-persona">${escapeHtml(tupper.personaName)}</div>
                <div class="sillytupper-trigger">
                    Trigger : <strong>${escapeHtml(tupper.trigger)}</strong>
                </div>
            </div>
            <div class="sillytupper-item-actions">
                <button class="sillytupper-toggle" type="button">
                    ${tupper.enabled === false ? '○' : '●'}
                </button>
                <button class="sillytupper-edit" type="button">✎</button>
                <button class="sillytupper-delete" type="button">×</button>
            </div>
        `;

        item.querySelector('.sillytupper-toggle').addEventListener('click', () => {
            tupper.enabled = tupper.enabled === false;
            saveSettings();
            renderTupperList();
        });

        item.querySelector('.sillytupper-edit').addEventListener('click', () => {
            showTupperDialog(tupper);
        });

        item.querySelector('.sillytupper-delete').addEventListener('click', () => {
            if (!confirm(`Supprimer le Tupper "${tupper.trigger}" ?`)) return;
            extension_settings[extensionName].tuppers =
                extension_settings[extensionName].tuppers.filter(t => t.id !== tupper.id);
            saveSettings();
            renderTupperList();
        });

        list.appendChild(item);
    }
}

/* =========================================================
   PANEL
   ========================================================= */
function createPanel() {
    if (document.getElementById('sillytupper-settings')) return;

    const settingsContainer = document.getElementById('extensions_settings2');
    if (!settingsContainer) {
        console.error('[SillyTupper] #extensions_settings2 introuvable.');
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'sillytupper-settings';
    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>SillyTupper</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="sillytupper-panel">
                    <div class="sillytupper-header">
                        <div>
                            <div class="sillytupper-title">Gestion des Tuppers</div>
                            <div class="sillytupper-subtitle">Configure tes Personas et leurs triggers.</div>
                        </div>
                        <label class="sillytupper-switch">
                            <input type="checkbox" id="sillytupper-enabled">
                            <span></span>
                        </label>
                    </div>
                    <div class="sillytupper-divider"></div>
                    <div id="sillytupper-list" class="sillytupper-list"></div>
                    <button id="sillytupper-add" class="sillytupper-add" type="button">
                        ＋ Ajouter un Tupper
                    </button>
                </div>
            </div>
        </div>
    `;

    settingsContainer.appendChild(wrapper);

    const enabled = document.getElementById('sillytupper-enabled');
    enabled.checked = extension_settings[extensionName].enabled;
    enabled.addEventListener('change', () => {
        extension_settings[extensionName].enabled = enabled.checked;
        saveSettings();
    });

    document.getElementById('sillytupper-add').addEventListener('click', () => {
        showTupperDialog();
    });

    renderTupperList();
}

/* =========================================================
   TUPPER DIALOG
   ========================================================= */
function showTupperDialog(existingTupper = null) {
    const personas = getPersonas();
    if (!personas.length) {
        alert('Aucune Persona disponible.');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'sillytupper-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'sillytupper-dialog';

    const selectedAvatar = existingTupper?.avatarId || '';
    const selectedTrigger = existingTupper?.trigger || '';

    dialog.innerHTML = `
        <div class="sillytupper-dialog-title">
            ${existingTupper ? 'Modifier le Tupper' : 'Ajouter un Tupper'}
        </div>

        <label class="sillytupper-label">Persona</label>
        <select id="sillytupper-persona-select" class="sillytupper-select">
            ${personas.map(p => `
                <option value="${escapeHtml(p.avatarId)}" ${p.avatarId === selectedAvatar ? 'selected' : ''}>
                    ${escapeHtml(p.name)}
                </option>
            `).join('')}
        </select>

        <label class="sillytupper-label">Trigger</label>
        <input id="sillytupper-trigger-input" class="sillytupper-input" type="text" maxlength="50"
               placeholder="Exemple : Heinrich" value="${escapeHtml(selectedTrigger)}">

        <div class="sillytupper-preview">
            <span>Utilisation :</span>
            <code>Heinrich: Bonjour</code>
        </div>

        <div class="sillytupper-dialog-buttons">
            <button id="sillytupper-cancel" class="sillytupper-cancel" type="button">Annuler</button>
            <button id="sillytupper-save" class="sillytupper-save" type="button">Enregistrer</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('#sillytupper-cancel').addEventListener('click', () => overlay.remove());

    dialog.querySelector('#sillytupper-save').addEventListener('click', () => {
        const select = dialog.querySelector('#sillytupper-persona-select');
        const triggerInput = dialog.querySelector('#sillytupper-trigger-input');
        const avatarId = select.value;
        const trigger = triggerInput.value.trim();

        if (!trigger) {
            alert('Entre un trigger.');
            return;
        }

        const duplicate = extension_settings[extensionName].tuppers.find(t =>
            t.id !== existingTupper?.id &&
            normalizeTrigger(t.trigger) === normalizeTrigger(trigger)
        );

        if (duplicate) {
            alert(`Le trigger "${trigger}" est déjà utilisé par "${duplicate.personaName}".`);
            return;
        }

        const persona = personas.find(p => p.avatarId === avatarId);
        if (!persona) return;

        if (existingTupper) {
            existingTupper.avatarId = persona.avatarId;
            existingTupper.personaName = persona.name;
            existingTupper.trigger = trigger;
        } else {
            extension_settings[extensionName].tuppers.push({
                id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                avatarId: persona.avatarId,
                personaName: persona.name,
                trigger: trigger,
                enabled: true
            });
        }

        saveSettings();
        renderTupperList();
        overlay.remove();
    });

    dialog.querySelector('#sillytupper-trigger-input').focus();
}

/* =========================================================
   INITIALIZATION
   ========================================================= */
function initialize() {
    try {
        loadSettings();
        createPanel();
        setupKeyboardListener();
        setupSendButtonListener();
        console.log('[SillyTupper] Extension chargée (version compatible PC + Mobile)');
    } catch (error) {
        console.error('[SillyTupper] Erreur d\'initialisation :', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}

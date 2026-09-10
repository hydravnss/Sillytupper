import { extension_settings } from '../../../extensions.js';
import { setUserAvatar } from '../../../personas.js';
import { power_user } from '../../../power-user.js';
import { sendTextareaMessage } from '../../../../script.js';


const extensionName = 'SillyTupper';

let isProcessing = false;


/* =========================================================
   DEFAULT SETTINGS
   ========================================================= */

function getDefaultSettings() {
    return {
        enabled: true,
        tuppers: []
    };
}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

function loadSettings() {

    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = getDefaultSettings();
    }

    const settings = extension_settings[extensionName];

    if (typeof settings.enabled !== 'boolean') {
        settings.enabled = true;
    }

    if (!Array.isArray(settings.tuppers)) {
        settings.tuppers = [];
    }
}


/* =========================================================
   SAVE SETTINGS
   ========================================================= */

function saveSettings() {

    extension_settings[extensionName] = {
        enabled: extension_settings[extensionName].enabled,
        tuppers: extension_settings[extensionName].tuppers
    };

    if (typeof saveSettingsDebounced === 'function') {
        saveSettingsDebounced();
    }
}


/* =========================================================
   GET PERSONAS
   ========================================================= */

function getPersonas() {

    const personas = power_user?.personas;

    if (!personas || typeof personas !== 'object') {
        return [];
    }

    return Object.entries(personas).map(
        ([avatarId, name]) => ({
            avatarId,
            name: String(name).trim()
        })
    );
}


/* =========================================================
   FIND TUPPER BY TRIGGER
   ========================================================= */

function findTupperByTrigger(trigger) {

    const search = trigger
        .trim()
        .toLowerCase();

    if (!search) {
        return null;
    }

    const tuppers =
        extension_settings[extensionName].tuppers;

    return tuppers.find(
        tupper =>
            tupper.enabled !== false &&
            String(tupper.trigger).trim().toLowerCase() === search
    ) || null;
}


/* =========================================================
   FIND TUPPER BY ID
   ========================================================= */

function findTupperById(id) {

    return extension_settings[extensionName]
        .tuppers
        .find(tupper => tupper.id === id);
}


/* =========================================================
   PARSE MESSAGE
   ========================================================= */

function parseTupperMessage(text) {

    if (!text) {
        return null;
    }

    const match = text.match(
        /^([^:\n]{1,100}):\s*([\s\S]*)$/
    );

    if (!match) {
        return null;
    }

    const trigger = match[1].trim();
    const message = match[2].trim();

    if (!trigger || !message) {
        return null;
    }

    return {
        trigger,
        message
    };
}


/* =========================================================
   PROCESS MESSAGE
   ========================================================= */

async function processTupperMessage() {

    if (isProcessing) {
        return false;
    }

    if (!extension_settings[extensionName]?.enabled) {
        return false;
    }

    const textarea =
        document.getElementById('send_textarea');

    if (!textarea) {
        return false;
    }

    const originalText = textarea.value;

    const parsed =
        parseTupperMessage(originalText);

    if (!parsed) {
        return false;
    }

    /*
     * Cherche le trigger dans le panneau.
     */

    const tupper =
        findTupperByTrigger(parsed.trigger);

    /*
     * Aucun Tupper correspondant :
     * SillyTavern garde son fonctionnement normal.
     */

    if (!tupper) {
        return false;
    }

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] Trigger "${parsed.trigger}" → ${tupper.personaName}`
        );

        /*
         * Sélection directe de la Persona
         * grâce à son avatarId enregistré
         * dans le panneau.
         */

        await setUserAvatar(
            tupper.avatarId,
            {
                toastPersonaNameChange: false
            }
        );

        /*
         * Remplace :
         *
         * Heinrich: Bonjour
         *
         * par :
         *
         * Bonjour
         */

        textarea.value = parsed.message;

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true
            })
        );

        /*
         * Laisse SillyTavern appliquer
         * le changement de Persona.
         */

        await new Promise(
            resolve => setTimeout(resolve, 0)
        );

        /*
         * Envoi natif.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Message envoyé sous "${tupper.personaName}".`
        );

        return true;

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur :',
            error
        );

        textarea.value = originalText;

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true
            })
        );

        return false;

    } finally {

        isProcessing = false;
    }
}


/* =========================================================
   ENTER
   ========================================================= */

function setupKeyboardListener() {

    document.addEventListener(
        'keydown',
        async event => {

            if (event.key !== 'Enter') {
                return;
            }

            if (
                event.shiftKey ||
                event.ctrlKey ||
                event.altKey ||
                event.metaKey
            ) {
                return;
            }

            const textarea =
                document.getElementById('send_textarea');

            if (!textarea) {
                return;
            }

            if (event.target !== textarea) {
                return;
            }

            const parsed =
                parseTupperMessage(
                    textarea.value.trim()
                );

            if (!parsed) {
                return;
            }

            /*
             * Vérifie qu'un Tupper existe.
             */

            const tupper =
                findTupperByTrigger(parsed.trigger);

            if (!tupper) {
                return;
            }

            /*
             * Bloque l'envoi natif.
             */

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            await processTupperMessage();

        },
        true
    );
}


/* =========================================================
   SEND BUTTON
   ========================================================= */

function setupSendButtonListener() {

    document.addEventListener(
        'click',
        async event => {

            const button =
                event.target.closest('#send_but');

            if (!button) {
                return;
            }

            const textarea =
                document.getElementById('send_textarea');

            if (!textarea) {
                return;
            }

            const parsed =
                parseTupperMessage(
                    textarea.value.trim()
                );

            if (!parsed) {
                return;
            }

            const tupper =
                findTupperByTrigger(parsed.trigger);

            if (!tupper) {
                return;
            }

            /*
             * Bloque l'envoi natif.
             */

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            await processTupperMessage();

        },
        true
    );
}


/* =========================================================
   PANEL HTML
   ========================================================= */

function createPanel() {

    if (document.getElementById(
        'sillytupper-panel'
    )) {
        return;
    }

    const container =
        document.createElement('div');

    container.id = 'sillytupper-panel';
    container.className =
        'sillytupper-panel';

    container.innerHTML = `
        <div class="sillytupper-header">
            <div>
                <div class="sillytupper-title">
                    SillyTupper
                </div>

                <div class="sillytupper-subtitle">
                    Gestion de tes Tuppers
                </div>
            </div>

            <label class="sillytupper-switch">
                <input
                    type="checkbox"
                    id="sillytupper-enabled"
                >

                <span></span>
            </label>
        </div>

        <div class="sillytupper-divider"></div>

        <div
            id="sillytupper-list"
            class="sillytupper-list"
        ></div>

        <button
            id="sillytupper-add"
            class="sillytupper-add"
            type="button"
        >
            <span>＋</span>
            Ajouter un Tupper
        </button>
    `;

    /*
     * On ajoute le panneau aux paramètres
     * des extensions SillyTavern.
     */

    const settingsContainer =
        document.getElementById(
            'extensions_settings'
        );

    if (settingsContainer) {

        settingsContainer.prepend(
            container
        );

    } else {

        document.body.prepend(
            container
        );
    }

    setupPanelEvents();

    renderPanel();
}


/* =========================================================
   PANEL EVENTS
   ========================================================= */

function setupPanelEvents() {

    const enabled =
        document.getElementById(
            'sillytupper-enabled'
        );

    if (enabled) {

        enabled.checked =
            extension_settings[
                extensionName
            ].enabled;

        enabled.addEventListener(
            'change',
            () => {

                extension_settings[
                    extensionName
                ].enabled = enabled.checked;

                saveSettings();
            }
        );
    }


    const addButton =
        document.getElementById(
            'sillytupper-add'
        );

    if (addButton) {

        addButton.addEventListener(
            'click',
            showAddTupper
        );
    }
}


/* =========================================================
   RENDER PANEL
   ========================================================= */

function renderPanel() {

    const list =
        document.getElementById(
            'sillytupper-list'
        );

    if (!list) {
        return;
    }

    list.innerHTML = '';

    const tuppers =
        extension_settings[
            extensionName
        ].tuppers;

    if (tuppers.length === 0) {

        list.innerHTML = `
            <div class="sillytupper-empty">
                Aucun Tupper configuré.
                <br>
                Ajoute une Persona pour commencer.
            </div>
        `;

        return;
    }

    for (const tupper of tuppers) {

        const item =
            document.createElement('div');

        item.className =
            'sillytupper-item';

        if (tupper.enabled === false) {
            item.classList.add(
                'sillytupper-disabled'
            );
        }

        item.innerHTML = `
            <div class="sillytupper-item-info">

                <div class="sillytupper-persona">
                    ${escapeHtml(tupper.personaName)}
                </div>

                <div class="sillytupper-trigger">
                    Trigger :
                    <strong>
                        ${escapeHtml(tupper.trigger)}
                    </strong>
                </div>

            </div>

            <div class="sillytupper-item-actions">

                <button
                    class="sillytupper-toggle"
                    type="button"
                    title="Activer / désactiver"
                >
                    ${tupper.enabled === false ? '○' : '●'}
                </button>

                <button
                    class="sillytupper-edit"
                    type="button"
                    title="Modifier"
                >
                    ✎
                </button>

                <button
                    class="sillytupper-delete"
                    type="button"
                    title="Supprimer"
                >
                    ×
                </button>

            </div>
        `;

        item.querySelector(
            '.sillytupper-toggle'
        ).addEventListener(
            'click',
            () => {

                tupper.enabled =
                    tupper.enabled === false;

                saveSettings();
                renderPanel();
            }
        );

        item.querySelector(
            '.sillytupper-edit'
        ).addEventListener(
            'click',
            () => {

                showEditTupper(
                    tupper.id
                );
            }
        );

        item.querySelector(
            '.sillytupper-delete'
        ).addEventListener(
            'click',
            () => {

                if (
                    confirm(
                        `Supprimer le Tupper "${tupper.trigger}" ?`
                    )
                ) {

                    extension_settings[
                        extensionName
                    ].tuppers =
                        extension_settings[
                            extensionName
                        ].tuppers.filter(
                            item =>
                                item.id !== tupper.id
                        );

                    saveSettings();
                    renderPanel();
                }
            }
        );

        list.appendChild(item);
    }
}


/* =========================================================
   ADD TUPPER
   ========================================================= */

function showAddTupper() {

    showTupperDialog(null);
}


/* =========================================================
   EDIT TUPPER
   ========================================================= */

function showEditTupper(id) {

    const tupper =
        findTupperById(id);

    if (!tupper) {
        return;
    }

    showTupperDialog(tupper);
}


/* =========================================================
   TUPPER DIALOG
   ========================================================= */

function showTupperDialog(existingTupper) {

    const personas = getPersonas();

    if (personas.length === 0) {

        alert(
            'Aucune Persona disponible.'
        );

        return;
    }

    const overlay =
        document.createElement('div');

    overlay.className =
        'sillytupper-overlay';

    const dialog =
        document.createElement('div');

    dialog.className =
        'sillytupper-dialog';

    const selectedAvatar =
        existingTupper?.avatarId || '';

    const selectedTrigger =
        existingTupper?.trigger || '';

    dialog.innerHTML = `
        <div class="sillytupper-dialog-title">
            ${existingTupper
                ? 'Modifier le Tupper'
                : 'Ajouter un Tupper'}
        </div>

        <label class="sillytupper-label">
            Persona
        </label>

        <select
            id="sillytupper-persona-select"
            class="sillytupper-select"
        >
            ${personas.map(persona => `
                <option
                    value="${escapeHtml(persona.avatarId)}"
                    ${persona.avatarId === selectedAvatar
                        ? 'selected'
                        : ''}
                >
                    ${escapeHtml(persona.name)}
                </option>
            `).join('')}
        </select>

        <label class="sillytupper-label">
            Trigger
        </label>

        <input
            id="sillytupper-trigger-input"
            class="sillytupper-input"
            type="text"
            maxlength="50"
            placeholder="Exemple : Heinrich"
            value="${escapeHtml(selectedTrigger)}"
        >

        <div class="sillytupper-preview">
            <span>Exemple :</span>
            <code>
                Heinrich: Bonjour
            </code>
        </div>

        <div class="sillytupper-dialog-buttons">

            <button
                id="sillytupper-cancel"
                class="sillytupper-cancel"
                type="button"
            >
                Annuler
            </button>

            <button
                id="sillytupper-save"
                class="sillytupper-save"
                type="button"
            >
                Enregistrer
            </button>

        </div>
    `;

    overlay.appendChild(dialog);

    document.body.appendChild(overlay);


    const select =
        dialog.querySelector(
            '#sillytupper-persona-select'
        );

    const triggerInput =
        dialog.querySelector(
            '#sillytupper-trigger-input'
        );


    dialog.querySelector(
        '#sillytupper-cancel'
    ).addEventListener(
        'click',
        () => overlay.remove()
    );


    dialog.querySelector(
        '#sillytupper-save'
    ).addEventListener(
        'click',
        () => {

            const avatarId =
                select.value;

            const trigger =
                triggerInput.value.trim();

            if (!trigger) {

                alert(
                    'Entre un trigger.'
                );

                return;
            }

            /*
             * Vérifie les doublons.
             */

            const duplicate =
                extension_settings[
                    extensionName
                ].tuppers.find(
                    tupper =>
                        tupper.id !==
                        existingTupper?.id &&
                        tupper.trigger
                            .trim()
                            .toLowerCase() ===
                        trigger.toLowerCase()
                );

            if (duplicate) {

                alert(
                    `Le trigger "${trigger}" est déjà utilisé.`
                );

                return;
            }

            const persona =
                personas.find(
                    item =>
                        item.avatarId === avatarId
                );

            if (!persona) {
                return;
            }

            if (existingTupper) {

                existingTupper.avatarId =
                    persona.avatarId;

                existingTupper.personaName =
                    persona.name;

                existingTupper.trigger =
                    trigger;

            } else {

                extension_settings[
                    extensionName
                ].tuppers.push({

                    id:
                        `${Date.now()}_${Math.random()
                            .toString(36)
                            .slice(2)}`,

                    avatarId:
                        persona.avatarId,

                    personaName:
                        persona.name,

                    trigger:
                        trigger,

                    enabled:
                        true
                });
            }

            saveSettings();

            renderPanel();

            overlay.remove();
        }
    );


    triggerInput.focus();
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
   INITIALIZE
   ========================================================= */

function initialize() {

    try {

        loadSettings();

        createPanel();

        setupKeyboardListener();

        setupSendButtonListener();

        console.log(
            '[SillyTupper] Extension chargée avec succès.'
        );

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur d\'initialisation :',
            error
        );
    }
}


/* =========================================================
   START
   ========================================================= */

if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        initialize,
        {
            once: true
        }
    );

} else {

    initialize();
}
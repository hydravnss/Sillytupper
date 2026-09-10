import { extension_settings } from '../../../extensions.js';
import { power_user } from '../../../power-user.js';
import { setUserAvatar } from '../../../personas.js';
import { sendTextareaMessage } from '../../../../script.js';

const extensionName = 'SillyTupper';

let isProcessing = false;


/* =========================================================
   SETTINGS
   ========================================================= */

function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = {};
    }
}


/* =========================================================
   FIND TEXTAREA
   ========================================================= */

function getTextarea() {
    return document.querySelector('#send_textarea');
}


/* =========================================================
   FIND PERSONA BY FIRST NAME
   ========================================================= */

function findPersonaByFirstName(firstName) {
    const personas = power_user?.personas;

    if (!personas || typeof personas !== 'object') {
        console.warn('[SillyTupper] Aucune Persona trouvée.');
        return null;
    }

    const wanted = firstName.trim().toLowerCase();

    for (const [avatarId, personaName] of Object.entries(personas)) {
        if (!personaName) continue;

        const fullName = String(personaName).trim();
        const firstNameOfPersona = fullName.split(/\s+/)[0].toLowerCase();

        if (firstNameOfPersona === wanted) {
            console.log(
                `[SillyTupper] Persona trouvée : ${fullName} (${avatarId})`
            );

            return {
                avatarId,
                fullName,
            };
        }
    }

    console.log(
        `[SillyTupper] Aucune Persona correspondant à "${firstName}".`
    );

    return null;
}


/* =========================================================
   PARSE MESSAGE
   ========================================================= */

function parseTupperMessage(text) {
    if (!text) return null;

    const match = text.match(/^([^:\n]{1,60}):\s*([\s\S]*)$/);

    if (!match) {
        return null;
    }

    const personaName = match[1].trim();
    const message = match[2];

    if (!personaName || !message.trim()) {
        return null;
    }

    return {
        personaName,
        message,
    };
}


/* =========================================================
   PROCESS MESSAGE
   ========================================================= */

async function processTupperMessage() {
    if (isProcessing) return;

    const textarea = getTextarea();

    if (!textarea) {
        console.warn('[SillyTupper] send_textarea introuvable.');
        return;
    }

    const originalText = textarea.value;
    const parsed = parseTupperMessage(originalText);

    if (!parsed) {
        return;
    }

    const persona = findPersonaByFirstName(parsed.personaName);

    if (!persona) {
        return;
    }

    isProcessing = true;

    try {
        console.log(
            `[SillyTupper] Changement vers "${persona.fullName}"...`
        );

        /* Changer la Persona */
        setUserAvatar(persona.avatarId, {
            toastPersonaNameChange: false,
        });

        /*
         * Remplacer le contenu de la zone de texte
         * Narrator: test
         * devient
         * test
         */
        textarea.value = parsed.message;

        /* Informer SillyTavern du changement */
        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

        textarea.dispatchEvent(
            new Event('change', {
                bubbles: true,
            })
        );

        /*
         * Laisser SillyTavern appliquer le changement
         * de Persona avant l'envoi.
         */
        await new Promise(resolve => setTimeout(resolve, 50));

        console.log(
            `[SillyTupper] Envoi avec "${persona.fullName}" :`,
            parsed.message
        );

        /* Envoi natif SillyTavern */
        await sendTextareaMessage();

    } catch (error) {
        console.error(
            '[SillyTupper] Erreur pendant l’envoi :',
            error
        );

        /*
         * Restaurer le texte original
         * en cas d'erreur.
         */
        textarea.value = originalText;

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

    } finally {
        isProcessing = false;
    }
}


/* =========================================================
   KEYBOARD — ENTER
   ========================================================= */

function handleKeyDown(event) {
    if (event.key !== 'Enter') {
        return;
    }

    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
        return;
    }

    const textarea = getTextarea();

    if (!textarea) {
        return;
    }

    /*
     * Ne rien faire si l'utilisateur n'est pas
     * dans la zone de saisie.
     */
    if (event.target !== textarea) {
        return;
    }

    const parsed = parseTupperMessage(textarea.value);

    if (!parsed) {
        return;
    }

    const persona = findPersonaByFirstName(parsed.personaName);

    /*
     * Si ce n'est pas une Persona valide,
     * SillyTavern garde son comportement normal.
     */
    if (!persona) {
        return;
    }

    console.log(
        '[SillyTupper] ENTER intercepté.'
    );

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    processTupperMessage();
}


/* =========================================================
   SEND BUTTON
   ========================================================= */

function handleSendClick(event) {
    const button = event.target.closest('#send_but');

    if (!button) {
        return;
    }

    const textarea = getTextarea();

    if (!textarea) {
        return;
    }

    const parsed = parseTupperMessage(textarea.value);

    if (!parsed) {
        return;
    }

    const persona = findPersonaByFirstName(parsed.personaName);

    if (!persona) {
        return;
    }

    console.log(
        '[SillyTupper] Bouton envoyer intercepté.'
    );

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    processTupperMessage();
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {
    loadSettings();

    /*
     * Capture = true
     *
     * Permet à SillyTupper d'intercepter l'action
     * avant les autres extensions comme FastSend.
     */
    document.addEventListener(
        'keydown',
        handleKeyDown,
        true
    );

    document.addEventListener(
        'click',
        handleSendClick,
        true
    );

    console.log(
        '%c[SillyTupper] Extension chargée.',
        'color:#7c5cff;font-weight:bold;'
    );

    console.log(
        '[SillyTupper] Personas disponibles :',
        power_user?.personas
    );
}


/* =========================================================
   START
   ========================================================= */

initialize();
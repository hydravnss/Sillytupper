import { extension_settings } from '../../../extensions.js';
import { autoSelectPersona } from '../../../personas.js';
import { power_user } from '../../../power-user.js';
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

    if (typeof extension_settings[extensionName].enabled !== 'boolean') {
        extension_settings[extensionName].enabled = true;
    }
}


/* =========================================================
   FIND PERSONA
   ========================================================= */

function findPersona(shortName) {

    const search = shortName.trim().toLowerCase();

    if (!search) {
        return null;
    }

    const personas = power_user.personas;

    if (!personas) {
        console.error('[SillyTupper] Personas indisponibles.');
        return null;
    }

    for (const persona of Object.values(personas)) {

        const name = String(persona).trim();

        if (!name) {
            continue;
        }

        /*
         * NOM COMPLET :
         *
         * Heinrich Himmler
         */

        if (name.toLowerCase() === search) {
            return name;
        }

        /*
         * PRÉNOM :
         *
         * Heinrich
         * ↓
         * Heinrich Himmler
         */

        const firstName = name
            .split(/\s+/)[0]
            .toLowerCase();

        if (firstName === search) {
            return name;
        }
    }

    return null;
}


/* =========================================================
   PARSE
   ========================================================= */

function parseTupperMessage(text) {

    if (!text) {
        return null;
    }

    const match = text.match(/^([^:\n]+):\s*([\s\S]+)$/);

    if (!match) {
        return null;
    }

    const name = match[1].trim();
    const message = match[2].trim();

    if (!name || !message) {
        return null;
    }

    return {
        name,
        message,
    };
}


/* =========================================================
   SEND
   ========================================================= */

async function processTupperMessage() {

    if (isProcessing) {
        return false;
    }

    if (!extension_settings[extensionName]?.enabled) {
        return false;
    }

    const textarea = document.getElementById('send_textarea');

    if (!textarea) {
        return false;
    }

    const originalText = textarea.value;

    const parsed = parseTupperMessage(originalText);

    if (!parsed) {
        return false;
    }

    const personaName = findPersona(parsed.name);

    if (!personaName) {
        console.log(
            `[SillyTupper] Persona "${parsed.name}" introuvable.`
        );

        return false;
    }

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] ${parsed.name} → ${personaName}`
        );

        /*
         * Sélectionne la Persona.
         */

        const selected = await autoSelectPersona(
            personaName
        );

        if (!selected) {
            console.error(
                `[SillyTupper] Impossible de sélectionner ${personaName}`
            );

            return false;
        }

        /*
         * ENLÈVE LE PRÉNOM DU MESSAGE.
         *
         * Heinrich: Bonjour
         *
         * devient :
         *
         * Bonjour
         */

        textarea.value = parsed.message;

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

        /*
         * Laisse SillyTavern appliquer
         * le changement de Persona.
         */

        await new Promise(resolve => setTimeout(resolve, 0));

        /*
         * Envoie le message.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Envoyé en tant que ${personaName}`
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
                bubbles: true,
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
        async (event) => {

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

            const textarea = document.getElementById(
                'send_textarea'
            );

            if (!textarea || event.target !== textarea) {
                return;
            }

            const parsed = parseTupperMessage(
                textarea.value.trim()
            );

            if (!parsed) {
                return;
            }

            /*
             * On ne bloque l'envoi que si le prénom
             * correspond réellement à une Persona.
             */

            if (!findPersona(parsed.name)) {
                return;
            }

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
        async (event) => {

            const button = event.target.closest('#send_but');

            if (!button) {
                return;
            }

            const textarea = document.getElementById(
                'send_textarea'
            );

            if (!textarea) {
                return;
            }

            const parsed = parseTupperMessage(
                textarea.value.trim()
            );

            if (!parsed) {
                return;
            }

            if (!findPersona(parsed.name)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            await processTupperMessage();

        },
        true
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initialize() {

    loadSettings();

    setupKeyboardListener();

    setupSendButtonListener();

    console.log(
        '[SillyTupper] Chargé.'
    );
}


/* =========================================================
   START
   ========================================================= */

if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        initialize,
        { once: true }
    );

} else {

    initialize();

}
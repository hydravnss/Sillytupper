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

    const wanted = shortName
        .trim()
        .toLowerCase();

    if (!wanted) {
        return null;
    }

    /*
     * Les Personas de SillyTavern sont :
     *
     * avatarId -> nom
     */

    const personas = power_user.personas;

    if (!personas) {
        return null;
    }

    /*
     * Cherche le prénom.
     */

    for (const [avatarId, personaName] of Object.entries(personas)) {

        if (!personaName) {
            continue;
        }

        const fullName = String(personaName).trim();

        if (!fullName) {
            continue;
        }

        const firstName = fullName
            .split(/\s+/)[0]
            .trim()
            .toLowerCase();

        /*
         * Exemple :
         *
         * Heinrich
         * ↓
         * Heinrich Himmler
         */

        if (firstName === wanted) {

            return {
                avatarId: avatarId,
                name: fullName,
            };
        }

        /*
         * Permet aussi le nom complet.
         */

        if (fullName.toLowerCase() === wanted) {

            return {
                avatarId: avatarId,
                name: fullName,
            };
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

    const match = text.match(
        /^([^:\n]{1,60}):\s*([\s\S]*)$/
    );

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
   PROCESS
   ========================================================= */

async function processTupperMessage() {

    if (isProcessing) {
        return false;
    }

    const textarea = document.getElementById(
        'send_textarea'
    );

    if (!textarea) {
        return false;
    }

    const originalText = textarea.value;

    const parsed = parseTupperMessage(
        originalText
    );

    if (!parsed) {
        return false;
    }

    /*
     * Cherche la Persona.
     */

    const persona = findPersona(
        parsed.name
    );

    if (!persona) {

        console.warn(
            `[SillyTupper] Persona introuvable : ${parsed.name}`
        );

        return false;
    }

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] ${parsed.name} → ${persona.name}`
        );

        /*
         * Sélection DIRECTE par avatar ID.
         *
         * C'est le même mécanisme natif que SillyTavern
         * utilise pour changer de Persona.
         */

        await setUserAvatar(
            persona.avatarId,
            {
                toastPersonaNameChange: false,
            }
        );

        /*
         * Retire :
         *
         * Heinrich:
         *
         * et garde :
         *
         * test
         */

        textarea.value = parsed.message;

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

        /*
         * Laisse ST appliquer la Persona.
         */

        await new Promise(
            resolve => setTimeout(resolve, 0)
        );

        /*
         * Envoi normal SillyTavern.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Envoyé sous ${persona.name}`
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

            const textarea = document.getElementById(
                'send_textarea'
            );

            if (!textarea) {
                return;
            }

            if (event.target !== textarea) {
                return;
            }

            const parsed = parseTupperMessage(
                textarea.value.trim()
            );

            if (!parsed) {
                return;
            }

            /*
             * Vérifie la Persona.
             */

            const persona = findPersona(
                parsed.name
            );

            if (!persona) {
                return;
            }

            /*
             * BLOQUE l'envoi natif.
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

            const button = event.target.closest(
                '#send_but'
            );

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

            const persona = findPersona(
                parsed.name
            );

            if (!persona) {
                return;
            }

            /*
             * BLOQUE l'envoi natif.
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
   INITIALIZE
   ========================================================= */

function initialize() {

    try {

        loadSettings();

        setupKeyboardListener();

        setupSendButtonListener();

        console.log(
            '[SillyTupper] Extension chargée.'
        );

        console.log(
            '[SillyTupper] Personas disponibles :',
            power_user.personas
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
        { once: true }
    );

} else {

    initialize();

}
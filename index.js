import { extension_settings } from '../../../extensions.js';
import { power_user } from '../../../power-user.js';
import { setUserAvatar } from '../../../personas.js';
import { sendTextareaMessage } from '../../../script.js';


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

function findPersonaByName(name) {
    if (!power_user?.personas) {
        return null;
    }

    const target = String(name)
        .trim()
        .toLowerCase();

    if (!target) {
        return null;
    }

    for (const [avatarId, personaName] of Object.entries(power_user.personas)) {
        if (!personaName) {
            continue;
        }

        if (
            String(personaName)
                .trim()
                .toLowerCase() === target
        ) {
            return avatarId;
        }
    }

    return null;
}


/* =========================================================
   PARSE TUPPER MESSAGE
   ========================================================= */

function parseTupperMessage(text) {
    if (!text) {
        return null;
    }

    /*
     * Format :
     *
     * Hagen: Bonjour
     *
     * Remus Lupin: Bonjour
     */

    const match = text.match(/^([^:\n]{1,60}):\s*([\s\S]*)$/);

    if (!match) {
        return null;
    }

    const personaName = match[1].trim();
    const message = match[2].trim();

    if (!personaName || !message) {
        return null;
    }

    return {
        personaName,
        message,
    };
}


/* =========================================================
   PROCESS TUPPER MESSAGE
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

    if (!originalText.trim()) {
        return false;
    }

    const parsed = parseTupperMessage(originalText);

    if (!parsed) {
        return false;
    }

    /*
     * Recherche de la Persona.
     */

    const avatarId = findPersonaByName(parsed.personaName);

    /*
     * Persona inconnue :
     * comportement normal de SillyTavern.
     */

    if (!avatarId) {
        console.log(
            `[SillyTupper] Persona inconnue : ${parsed.personaName}`
        );

        return false;
    }

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] Activation de la Persona : ${parsed.personaName}`
        );

        /*
         * Change la Persona.
         */

        await setUserAvatar(avatarId, {
            toastPersonaNameChange: true,
        });

        /*
         * Supprime le préfixe.
         *
         * Hagen: Bonjour
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
         * Laisse SillyTavern enregistrer
         * le changement de Persona.
         */

        await new Promise(resolve => setTimeout(resolve, 0));

        /*
         * Envoie le message.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Message envoyé avec la Persona "${parsed.personaName}".`
        );

        return true;

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur lors de l\'envoi :',
            error
        );

        /*
         * Restaure le message original.
         */

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
   KEYBOARD — ENTER
   ========================================================= */

function setupKeyboardListener() {

    document.addEventListener(
        'keydown',
        async (event) => {

            /*
             * Seulement Enter.
             */

            if (event.key !== 'Enter') {
                return;
            }

            /*
             * Shift + Enter = nouvelle ligne.
             */

            if (event.shiftKey) {
                return;
            }

            /*
             * Ignore les raccourcis clavier.
             */

            if (
                event.ctrlKey ||
                event.altKey ||
                event.metaKey
            ) {
                return;
            }

            const textarea = document.getElementById('send_textarea');

            if (!textarea) {
                return;
            }

            /*
             * Vérifie que l'événement vient
             * du champ de texte.
             */

            if (event.target !== textarea) {
                return;
            }

            const text = textarea.value.trim();

            if (!text) {
                return;
            }

            /*
             * Vérifie le format :
             *
             * Nom: message
             */

            const parsed = parseTupperMessage(text);

            if (!parsed) {
                return;
            }

            /*
             * Vérifie que la Persona existe.
             */

            const avatarId = findPersonaByName(parsed.personaName);

            if (!avatarId) {
                return;
            }

            /*
             * Bloque l'envoi normal
             * de SillyTavern.
             */

            event.preventDefault();
            event.stopImmediatePropagation();

            /*
             * Lance SillyTupper.
             */

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

            const textarea = document.getElementById('send_textarea');

            if (!textarea) {
                return;
            }

            const text = textarea.value.trim();

            if (!text) {
                return;
            }

            /*
             * Vérifie le format Tupper.
             */

            const parsed = parseTupperMessage(text);

            if (!parsed) {
                return;
            }

            /*
             * Vérifie que la Persona existe.
             */

            const avatarId = findPersonaByName(parsed.personaName);

            if (!avatarId) {
                return;
            }

            /*
             * Empêche SillyTavern d'envoyer
             * le message original.
             */

            event.preventDefault();
            event.stopImmediatePropagation();

            /*
             * Lance SillyTupper.
             */

            await processTupperMessage();

        },
        true
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {

    try {

        loadSettings();

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
            once: true,
        }
    );

} else {

    initialize();

}
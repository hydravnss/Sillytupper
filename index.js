import { extension_settings } from '../../../extensions.js';
import { autoSelectPersona } from '../../../personas.js';
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
   PARSE TUPPER
   ========================================================= */

function parseTupperMessage(text) {
    if (!text) {
        return null;
    }

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
   PROCESS MESSAGE
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

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] Recherche de la Persona : ${parsed.personaName}`
        );

        /*
         * Utilise directement le système natif
         * de sélection de Persona de SillyTavern.
         */
        const personaFound = await autoSelectPersona(
            parsed.personaName
        );

        /*
         * Persona inconnue :
         * on ne bloque pas SillyTavern.
         */
        if (!personaFound) {

            console.log(
                `[SillyTupper] Persona inconnue : ${parsed.personaName}`
            );

            return false;
        }

        console.log(
            `[SillyTupper] Persona sélectionnée : ${parsed.personaName}`
        );

        /*
         * Retire :
         *
         * Nom:
         *
         * du message.
         */
        textarea.value = parsed.message;

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

        /*
         * Laisse SillyTavern mettre à jour
         * le champ avant l'envoi.
         */
        await new Promise(resolve => setTimeout(resolve, 0));

        /*
         * Envoie le message.
         */
        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Message envoyé avec "${parsed.personaName}".`
        );

        return true;

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur :',
            error
        );

        /*
         * Restaure le message original
         * si quelque chose échoue.
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
   ENTER
   ========================================================= */

function setupKeyboardListener() {

    document.addEventListener(
        'keydown',
        async (event) => {

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
             * Ignore les raccourcis.
             */
            if (
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

            const text = textarea.value.trim();

            if (!text) {
                return;
            }

            const parsed = parseTupperMessage(text);

            /*
             * Message normal :
             * SillyTavern s'en occupe.
             */
            if (!parsed) {
                return;
            }

            /*
             * Vérifie que la Persona existe
             * avant de bloquer l'envoi natif.
             *
             * On utilise autoSelectPersona dans
             * processTupperMessage.
             *
             * Pour éviter de bloquer une Persona
             * inconnue, on tente d'abord la sélection.
             */
            event.preventDefault();
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

            const text = textarea.value.trim();

            if (!text) {
                return;
            }

            const parsed = parseTupperMessage(text);

            /*
             * Message normal :
             * SillyTavern s'en occupe.
             */
            if (!parsed) {
                return;
            }

            /*
             * On laisse processTupperMessage
             * gérer la Persona.
             */
            event.preventDefault();
            event.stopImmediatePropagation();

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
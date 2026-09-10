import { extension_settings } from '../../../extensions.js';
import { autoSelectPersona } from '../../../personas.js';
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
   PARSE TUPPER MESSAGE
   ========================================================= */

function parseTupperMessage(text) {
    if (!text) {
        return null;
    }

    /*
     * Formats :
     *
     * Hagen: Bonjour
     * Remus Lupin: Bonjour
     * Albert Speer: Bonjour
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
        console.warn(
            '[SillyTupper] send_textarea introuvable.'
        );

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
            `[SillyTupper] Recherche de la Persona : "${parsed.personaName}"`
        );

        /*
         * Sélection automatique de la Persona.
         */

        const personaFound = await autoSelectPersona(
            parsed.personaName
        );

        /*
         * Persona inexistante.
         */

        if (!personaFound) {

            console.log(
                `[SillyTupper] Persona introuvable : "${parsed.personaName}"`
            );

            return false;
        }

        console.log(
            `[SillyTupper] Persona sélectionnée : "${parsed.personaName}"`
        );

        /*
         * Retire le préfixe Tupper.
         *
         * Hagen: Bonjour
         *
         * devient :
         *
         * Bonjour
         */

        textarea.value = parsed.message;

        /*
         * Informe SillyTavern du changement.
         */

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

        /*
         * Laisse SillyTavern traiter le changement
         * avant l'envoi.
         */

        await new Promise(resolve => setTimeout(resolve, 0));

        /*
         * Envoie le message avec la Persona.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Message envoyé avec "${parsed.personaName}".`
        );

        return true;

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur lors du traitement :',
            error
        );

        /*
         * Restaure le message original
         * en cas d'erreur.
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

            if (event.key !== 'Enter') {
                return;
            }

            /*
             * Shift + Enter = retour à la ligne.
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

            /*
             * Vérifie que l'événement vient
             * bien du textarea.
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

            /*
             * Message normal :
             * SillyTavern fonctionne normalement.
             */

            if (!parsed) {
                return;
            }

            /*
             * Bloque l'envoi natif.
             */

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            /*
             * Traite le message Tupper.
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

            /*
             * Vérifie le format Tupper.
             */

            const parsed = parseTupperMessage(text);

            /*
             * Message normal :
             * SillyTavern fonctionne normalement.
             */

            if (!parsed) {
                return;
            }

            /*
             * Bloque l'envoi natif.
             */

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            /*
             * Traite le message.
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
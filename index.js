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

    /*
     * Empêche plusieurs traitements simultanés.
     */

    if (isProcessing) {
        return false;
    }

    /*
     * Vérifie que l'extension est activée.
     */

    if (!extension_settings[extensionName]?.enabled) {
        return false;
    }

    /*
     * Récupère le champ de saisie.
     */

    const textarea = document.getElementById('send_textarea');

    if (!textarea) {
        console.warn(
            '[SillyTupper] send_textarea introuvable.'
        );

        return false;
    }

    /*
     * Sauvegarde le message original.
     */

    const originalText = textarea.value;

    if (!originalText.trim()) {
        return false;
    }

    /*
     * Analyse le message.
     */

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
         * Recherche et sélectionne automatiquement
         * la Persona correspondante.
         */

        const personaFound = await autoSelectPersona(
            parsed.personaName
        );

        /*
         * Persona introuvable.
         */

        if (!personaFound) {

            console.log(
                `[SillyTupper] Persona introuvable : "${parsed.personaName}"`
            );

            /*
             * On ne modifie pas le message.
             */

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
         * Informe SillyTavern du changement
         * du contenu du textarea.
         */

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

        /*
         * Laisse le navigateur et SillyTavern
         * traiter le changement.
         */

        await new Promise(resolve => setTimeout(resolve, 0));

        /*
         * Envoie le message via l'API native
         * de SillyTavern.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Message envoyé avec la Persona "${parsed.personaName}".`
        );

        return true;

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur lors du traitement :',
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
   KEYBOARD — ENTER
   ========================================================= */

function setupKeyboardListener() {

    document.addEventListener(
        'keydown',
        async (event) => {

            /*
             * Seulement la touche Enter.
             */

            if (event.key !== 'Enter') {
                return;
            }

            /*
             * Shift + Enter :
             * retour à la ligne normal.
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

            /*
             * Récupère le textarea.
             */

            const textarea = document.getElementById(
                'send_textarea'
            );

            if (!textarea) {
                return;
            }

            /*
             * Vérifie que Enter vient bien
             * du textarea.
             */

            if (event.target !== textarea) {
                return;
            }

            /*
             * Vérifie le contenu.
             */

            const text = textarea.value.trim();

            if (!text) {
                return;
            }

            /*
             * Vérifie si le message possède
             * un préfixe Tupper.
             */

            const parsed = parseTupperMessage(text);

            /*
             * Message normal :
             * SillyTavern le traite normalement.
             */

            if (!parsed) {
                return;
            }

            /*
             * Si un traitement est déjà en cours,
             * ne rien faire.
             */

            if (isProcessing) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }

            /*
             * On bloque l'envoi natif.
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

            /*
             * Recherche le bouton d'envoi.
             */

            const button = event.target.closest(
                '#send_but'
            );

            if (!button) {
                return;
            }

            /*
             * Récupère le textarea.
             */

            const textarea = document.getElementById(
                'send_textarea'
            );

            if (!textarea) {
                return;
            }

            /*
             * Récupère le texte.
             */

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
             * comportement natif de SillyTavern.
             */

            if (!parsed) {
                return;
            }

            /*
             * Évite les doubles envois.
             */

            if (isProcessing) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }

            /*
             * Empêche le bouton natif
             * d'envoyer le message original.
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
   INITIALIZATION
   ========================================================= */

function initialize() {

    try {

        /*
         * Charge les paramètres.
         */

        loadSettings();

        /*
         * Active la détection de Enter.
         */

        setupKeyboardListener();

        /*
         * Active la détection du bouton Envoyer.
         */

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
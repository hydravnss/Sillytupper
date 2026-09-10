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
   RESOLVE PERSONA
   ========================================================= */

function resolvePersonaName(input) {

    const search = String(input).trim().toLowerCase();

    if (!search) {
        return null;
    }

    const personas = power_user.personas;

    if (!personas) {
        console.error('[SillyTupper] power_user.personas est introuvable.');
        return null;
    }

    /*
     * 1. Nom complet exact
     */

    for (const value of Object.values(personas)) {

        const name = String(value).trim();

        if (name.toLowerCase() === search) {
            return name;
        }
    }

    /*
     * 2. Prénom uniquement
     */

    for (const value of Object.values(personas)) {

        const name = String(value).trim();

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
   PROCESS
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

    const resolvedName = resolvePersonaName(
        parsed.personaName
    );

    /*
     * Pas une Persona :
     * on laisse SillyTavern fonctionner normalement.
     */

    if (!resolvedName) {
        console.log(
            `[SillyTupper] Aucune Persona pour "${parsed.personaName}"`
        );

        return false;
    }

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] ${parsed.personaName} → ${resolvedName}`
        );

        /*
         * EXACTEMENT la fonction qui fonctionnait
         * dans ton ancien code.
         */

        const selected = await autoSelectPersona(
            resolvedName
        );

        if (!selected) {

            console.error(
                `[SillyTupper] Impossible de sélectionner "${resolvedName}"`
            );

            return false;
        }

        /*
         * Supprime :
         *
         * Narrator:
         *
         * et garde uniquement :
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

        await new Promise(resolve => setTimeout(resolve, 0));

        /*
         * Envoi natif ST.
         */

        await sendTextareaMessage();

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
             * IMPORTANT :
             * on vérifie le prénom AVANT de bloquer ST.
             */

            if (!resolvePersonaName(parsed.personaName)) {
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

            if (!resolvePersonaName(parsed.personaName)) {
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
        '[SillyTupper] Extension chargée.'
    );

    /*
     * Vérification immédiate pour savoir si
     * SillyTavern nous donne bien les Personas.
     */

    console.log(
        '[SillyTupper] Personas :',
        power_user.personas
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
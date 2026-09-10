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

    if (typeof extension_settings[extensionName].enabled !== 'boolean') {
        extension_settings[extensionName].enabled = true;
    }
}


/* =========================================================
   FIND PERSONA BY FIRST NAME
   ========================================================= */

function findPersonaByFirstName(name) {
    if (!power_user?.personas) {
        return null;
    }

    const target = String(name)
        .trim()
        .toLowerCase();

    if (!target) {
        return null;
    }

    /*
     * Parcourt toutes les Personas.
     *
     * Exemple :
     *
     * "Wilhelm Burgdorf"
     *
     * devient :
     *
     * "wilhelm"
     */

    for (const [avatarId, personaName] of Object.entries(
        power_user.personas
    )) {

        if (!personaName) {
            continue;
        }

        const fullName = String(personaName).trim();

        const firstName = fullName
            .split(/\s+/)[0]
            .toLowerCase();

        if (firstName === target) {

            return {
                avatarId,
                fullName,
            };
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
     * Wilhelm: Bonjour
     * Narrator: Bonjour
     * Heinrich: Bonjour
     */

    const match = text.match(
        /^([^:\n]{1,60}):\s*([\s\S]*)$/
    );

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

    const textarea = document.getElementById(
        'send_textarea'
    );

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

    const parsed = parseTupperMessage(
        originalText
    );

    if (!parsed) {
        return false;
    }

    /*
     * Recherche de la Persona.
     */

    const persona = findPersonaByFirstName(
        parsed.personaName
    );

    /*
     * Si aucune Persona ne correspond,
     * on laisse SillyTavern fonctionner normalement.
     */

    if (!persona) {

        console.log(
            `[SillyTupper] Aucune Persona trouvée pour "${parsed.personaName}".`
        );

        return false;
    }

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] Persona trouvée : "${persona.fullName}"`
        );

        /*
         * Sélectionne directement la Persona
         * avec son avatar ID unique.
         */

        await setUserAvatar(
            persona.avatarId,
            {
                toastPersonaNameChange: true,
            }
        );

        console.log(
            `[SillyTupper] Persona activée : "${persona.fullName}"`
        );

        /*
         * Retire le préfixe.
         *
         * Wilhelm: Bonjour
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
         * Laisse SillyTavern mettre à jour
         * la Persona avant l'envoi.
         */

        await new Promise(
            resolve => setTimeout(resolve, 0)
        );

        /*
         * Envoie le message.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Message envoyé avec "${persona.fullName}".`
        );

        return true;

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur :',
            error
        );

        /*
         * Restaure le message original
         * si une erreur survient.
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
             * SillyTavern fonctionne normalement.
             */

            if (!parsed) {
                return;
            }

            /*
             * Vérifie que la Persona existe
             * AVANT de bloquer l'envoi natif.
             */

            const persona = findPersonaByFirstName(
                parsed.personaName
            );

            if (!persona) {
                return;
            }

            /*
             * Bloque l'envoi natif.
             */

            event.preventDefault();
            event.stopPropagation();
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
             * comportement normal de SillyTavern.
             */

            if (!parsed) {
                return;
            }

            /*
             * Vérifie que la Persona existe.
             */

            const persona = findPersonaByFirstName(
                parsed.personaName
            );

            if (!persona) {
                return;
            }

            /*
             * Bloque le bouton natif.
             */

            event.preventDefault();
            event.stopPropagation();
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
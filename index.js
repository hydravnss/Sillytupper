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
   FIND PERSONA BY FIRST NAME
   ========================================================= */

function findPersonaByFirstName(name) {

    if (!name || typeof name !== 'string') {
        return null;
    }

    const target = name
        .trim()
        .toLowerCase();

    if (!target) {
        return null;
    }

    /*
     * Récupère toutes les Personas disponibles
     * dans SillyTavern.
     */

    const personas = window.power_user?.personas;

    if (!personas) {
        return null;
    }

    /*
     * Recherche une Persona dont le premier mot
     * correspond au nom utilisé dans Tupper.
     *
     * Exemple :
     *
     * "Wilhelm Burgdorf"
     *
     * devient :
     *
     * "Wilhelm"
     */

    for (const personaName of Object.values(personas)) {

        if (!personaName) {
            continue;
        }

        const fullName = String(personaName)
            .trim();

        const firstName = fullName
            .split(/\s+/)[0]
            .toLowerCase();

        if (firstName === target) {
            return fullName;
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
     * Formats :
     *
     * Heinrich: Bonjour
     * Wilhelm: Bonjour
     * Narrator: Bonjour
     * Hydra: Bonjour
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

    isProcessing = true;

    try {

        console.log(
            `[SillyTupper] Recherche : "${parsed.personaName}"`
        );

        /*
         * Cherche une Persona correspondant
         * au premier nom.
         *
         * Exemple :
         *
         * "Wilhelm"
         *
         * trouve :
         *
         * "Wilhelm Burgdorf"
         */

        const fullPersonaName =
            findPersonaByFirstName(
                parsed.personaName
            );

        /*
         * Persona introuvable.
         */

        if (!fullPersonaName) {

            console.log(
                `[SillyTupper] Aucune Persona trouvée pour "${parsed.personaName}".`
            );

            return false;
        }

        console.log(
            `[SillyTupper] Persona trouvée : "${fullPersonaName}"`
        );

        /*
         * Sélectionne la Persona.
         */

        const personaFound =
            await autoSelectPersona(
                fullPersonaName
            );

        if (!personaFound) {

            console.warn(
                `[SillyTupper] Impossible de sélectionner "${fullPersonaName}".`
            );

            return false;
        }

        console.log(
            `[SillyTupper] Persona sélectionnée : "${fullPersonaName}"`
        );

        /*
         * Supprime le préfixe.
         *
         * Wilhelm: Bonjour
         *
         * devient :
         *
         * Bonjour
         */

        textarea.value = parsed.message;

        /*
         * Informe SillyTavern.
         */

        textarea.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );

        /*
         * Laisse SillyTavern mettre à jour
         * le champ avant l'envoi.
         */

        await new Promise(
            resolve => setTimeout(resolve, 0)
        );

        /*
         * Envoie le message.
         */

        await sendTextareaMessage();

        console.log(
            `[SillyTupper] Message envoyé avec "${fullPersonaName}".`
        );

        return true;

    } catch (error) {

        console.error(
            '[SillyTupper] Erreur lors du traitement :',
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

            const textarea =
                document.getElementById(
                    'send_textarea'
                );

            if (!textarea) {
                return;
            }

            if (event.target !== textarea) {
                return;
            }

            const text =
                textarea.value.trim();

            if (!text) {
                return;
            }

            const parsed =
                parseTupperMessage(text);

            /*
             * Message normal :
             * comportement normal de SillyTavern.
             */

            if (!parsed) {
                return;
            }

            /*
             * Vérifie qu'une Persona correspond
             * au premier nom.
             */

            const persona =
                findPersonaByFirstName(
                    parsed.personaName
                );

            /*
             * Si aucune Persona correspondante
             * n'existe, SillyTavern fonctionne
             * normalement.
             */

            if (!persona) {
                return;
            }

            /*
             * Empêche SillyTavern d'envoyer
             * le message original.
             */

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            /*
             * Traitement Tupper.
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

            const button =
                event.target.closest(
                    '#send_but'
                );

            if (!button) {
                return;
            }

            const textarea =
                document.getElementById(
                    'send_textarea'
                );

            if (!textarea) {
                return;
            }

            const text =
                textarea.value.trim();

            if (!text) {
                return;
            }

            const parsed =
                parseTupperMessage(text);

            /*
             * Message normal :
             * comportement normal.
             */

            if (!parsed) {
                return;
            }

            /*
             * Vérifie la Persona.
             */

            const persona =
                findPersonaByFirstName(
                    parsed.personaName
                );

            /*
             * Persona inconnue :
             * laisse SillyTavern envoyer normalement.
             */

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
             * Traitement Tupper.
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
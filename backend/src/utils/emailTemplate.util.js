const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '../templates/email');

/**
 * HTML entity encoder to prevent XSS / HTML injection in emails
 */
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escapes URL values for safe insertion into HTML href attributes
 */
function escapeUrl(value) {
    if (!value) return '#';
    return String(value).replace(/"/g, '%22').replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E');
}

/**
 * Renders a specific email template wrapped inside the master layout.html
 * 
 * @param {string} templateName - Filename (without .html extension) e.g., 'invitation'
 * @param {Object} variables - Key-value pair of template variables
 * @returns {string} Fully interpolated HTML string
 */
function renderEmailTemplate(templateName, variables = {}) {
    if (!templateName || typeof templateName !== 'string') {
        throw new Error('Template name must be a valid string.');
    }

    const cleanTemplateName = templateName.replace(/\.html$/i, '');
    const layoutPath = path.join(TEMPLATE_DIR, 'layout.html');
    const templatePath = path.join(TEMPLATE_DIR, `${cleanTemplateName}.html`);

    if (!fs.existsSync(layoutPath)) {
        console.error(`[EmailTemplateUtil] Master layout file missing at: ${layoutPath}`);
        throw new Error('Master email layout (layout.html) is missing.');
    }

    if (!fs.existsSync(templatePath)) {
        console.error(`[EmailTemplateUtil] Template '${cleanTemplateName}.html' missing at: ${templatePath}`);
        throw new Error(`Email template '${cleanTemplateName}' does not exist.`);
    }

    try {
        let layoutHtml = fs.readFileSync(layoutPath, 'utf8');
        let bodyHtml = fs.readFileSync(templatePath, 'utf8');

        const mergedVars = {
            year: new Date().getFullYear(),
            productName: 'Nuvince',
            tagline: 'Hospital Workforce Management',
            ...variables,
        };

        // Function to apply variables to an HTML string
        const applyVariables = (htmlContent) => {
            let result = htmlContent;
            for (const [key, val] of Object.entries(mergedVars)) {
                const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                const isUrlKey = /url|link/i.test(key);
                const safeVal = isUrlKey ? escapeUrl(val) : escapeHtml(val);
                result = result.replace(regex, safeVal);
            }
            return result;
        };

        // 1. Process body template variables
        bodyHtml = applyVariables(bodyHtml);

        // 2. Inject body into master layout placeholder
        let finalHtml = layoutHtml.replace(/{{\s*(content|body)\s*}}/g, bodyHtml);

        // 3. Process remaining global layout variables
        finalHtml = applyVariables(finalHtml);

        // 4. Strip any leftover unhandled {{var}} tags cleanly
        finalHtml = finalHtml.replace(/{{\s*[\w.]+\s*}}/g, '');

        return finalHtml;
    } catch (err) {
        console.error(`[EmailTemplateUtil] Failed to process template '${cleanTemplateName}':`, err.message);
        throw new Error(`Failed to render email template '${cleanTemplateName}': ${err.message}`);
    }
}

module.exports = {
    renderEmailTemplate,
    escapeHtml,
    escapeUrl,
};

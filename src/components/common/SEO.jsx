import { useEffect } from 'react';

const SEO = ({
    title,
    description = "Ras Ali is a multi-disciplinary creative and technologist based in Gaborone, specializing in premium web design, development, and digital experiences.",
    keywords = "Ras Ali, Web Design, Web Development, Gaborone, Botswana, Creative, Technologist, Portfolio",
    image = "/og-image.jpg",
    url
}) => {
    useEffect(() => {
        // Update Title
        document.title = title ? `${title} | Ras Ali` : 'Ras Ali - Multi-Disciplinary Creative & Technologist';

        // Helper to update meta tags
        const updateMeta = (name, content, attribute = 'name') => {
            if (!content) return;
            let element = document.querySelector(`meta[${attribute}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        updateMeta('description', description);
        updateMeta('keywords', keywords);

        // Open Graph / Facebook
        updateMeta('og:type', 'website', 'property');
        updateMeta('og:title', title || 'Ras Ali', 'property');
        updateMeta('og:description', description, 'property');
        updateMeta('og:image', image, 'property');
        updateMeta('og:url', url || window.location.href, 'property');
        updateMeta('og:site_name', 'Ras Ali Portfolio', 'property');

        // Twitter
        updateMeta('twitter:card', 'summary_large_image', 'name');
        updateMeta('twitter:creator', '@rasali', 'name'); // Placeholder
        updateMeta('twitter:title', title || 'Ras Ali', 'name');
        updateMeta('twitter:description', description, 'name');
        updateMeta('twitter:image', image, 'name');

    }, [title, description, keywords, image, url]);

    return null;
};

export default SEO;

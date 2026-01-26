import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
    title,
    description = "Ras Ali is a multi-disciplinary creative and technologist based in Gaborone, specializing in premium web design, development, and digital experiences.",
    keywords = "Ras Ali, Web Design, Web Development, Gaborone, Botswana, Creative, Technologist, Portfolio, UI/UX, AI Development",
    image = "https://rasalibassist.themaplin.com/og-image.jpg",
    url = "https://rasalibassist.themaplin.com",
    type = "website"
}) => {
    const siteTitle = title ? `${title} | Ras Ali` : 'Ras Ali - Multi-Disciplinary Creative & Technologist';
    const canonical = url.startsWith('http') ? url : `https://rasalibassist.themaplin.com${url}`;

    // Schema.org structured data for a Professional Service/Person
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "Ras Ali",
        "image": "https://rasalibassist.themaplin.com/logo.png",
        "@id": "https://rasalibassist.themaplin.com",
        "url": "https://rasalibassist.themaplin.com",
        "telephone": "+26770000000", // Update with actual if available
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Gaborone",
            "addressLocality": "Gaborone",
            "addressCountry": "BW"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": -24.6282,
            "longitude": 25.9231
        },
        "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday"
            ],
            "opens": "08:00",
            "closes": "17:00"
        }
    };

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{siteTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <link rel="canonical" href={canonical} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={canonical} />
            <meta property="og:site_name" content="Ras Ali Portfolio" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={siteTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
            <meta name="twitter:creator" content="@rasali" />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(schemaData)}
            </script>
        </Helmet>
    );
};

export default SEO;

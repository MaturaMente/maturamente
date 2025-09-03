import React from "react";

interface WebsiteStructuredDataProps {
  name: string;
  url: string;
  description: string;
  logo?: string;
  sameAs?: string[];
}

export function WebsiteStructuredData({
  name,
  url,
  description,
  logo = "/opengraph-image.png",
  sameAs = [],
}: WebsiteStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    logo: {
      "@type": "ImageObject",
      url: `${url}${logo}`,
    },
    sameAs,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface OrganizationStructuredDataProps {
  name: string;
  url: string;
  description: string;
  logo?: string;
  contactPoint?: {
    email: string;
    contactType: string;
  };
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressCountry: string;
  };
  sameAs?: string[];
}

export function OrganizationStructuredData({
  name,
  url,
  description,
  logo = "/opengraph-image.png",
  contactPoint,
  address,
  sameAs = [],
}: OrganizationStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    description,
    logo: {
      "@type": "ImageObject",
      url: `${url}${logo}`,
    },
    ...(contactPoint && {
      contactPoint: {
        "@type": "ContactPoint",
        email: contactPoint.email,
        contactType: contactPoint.contactType,
      },
    }),
    ...(address && {
      address: {
        "@type": "PostalAddress",
        ...address,
      },
    }),
    sameAs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface EducationalOrganizationStructuredDataProps {
  name: string;
  url: string;
  description: string;
  logo?: string;
  educationalCredentialAwarded?: string;
  hasCredential?: string[];
  sameAs?: string[];
}

export function EducationalOrganizationStructuredData({
  name,
  url,
  description,
  logo = "/opengraph-image.png",
  educationalCredentialAwarded,
  hasCredential = [],
  sameAs = [],
}: EducationalOrganizationStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name,
    url,
    description,
    logo: {
      "@type": "ImageObject",
      url: `${url}${logo}`,
    },
    ...(educationalCredentialAwarded && { educationalCredentialAwarded }),
    ...(hasCredential.length > 0 && { hasCredential }),
    sameAs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface CourseStructuredDataProps {
  name: string;
  description: string;
  url: string;
  provider: {
    name: string;
    url: string;
  };
  educationalLevel?: string;
  teaches?: string[];
  courseMode?: string;
  hasCourseInstance?: {
    courseMode: string;
    instructor?: {
      name: string;
    };
  };
}

export function CourseStructuredData({
  name,
  description,
  url,
  provider,
  educationalLevel = "High School",
  teaches = [],
  courseMode = "online",
  hasCourseInstance,
}: CourseStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url,
    provider: {
      "@type": "Organization",
      name: provider.name,
      url: provider.url,
    },
    educationalLevel,
    ...(teaches.length > 0 && { teaches }),
    courseMode,
    ...(hasCourseInstance && {
      hasCourseInstance: {
        "@type": "CourseInstance",
        ...hasCourseInstance,
        ...(hasCourseInstance.instructor && {
          instructor: {
            "@type": "Person",
            name: hasCourseInstance.instructor.name,
          },
        }),
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface ArticleStructuredDataProps {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
  };
  publisher: {
    name: string;
    url: string;
    logo?: string;
  };
  image?: string;
  articleSection?: string;
  keywords?: string[];
}

export function ArticleStructuredData({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author,
  publisher,
  image = "/opengraph-image.png",
  articleSection,
  keywords = [],
}: ArticleStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url,
    datePublished,
    ...(dateModified && { dateModified }),
    author: {
      "@type": "Person",
      name: author.name,
      ...(author.url && { url: author.url }),
    },
    publisher: {
      "@type": "Organization",
      name: publisher.name,
      url: publisher.url,
      logo: {
        "@type": "ImageObject",
        url: `${publisher.url}${publisher.logo || "/opengraph-image.png"}`,
      },
    },
    image: {
      "@type": "ImageObject",
      url: `${publisher.url}${image}`,
    },
    ...(articleSection && { articleSection }),
    ...(keywords.length > 0 && { keywords }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface LearningResourceStructuredDataProps {
  name: string;
  description: string;
  url: string;
  educationalLevel: string;
  learningResourceType: string;
  teaches?: string[];
  about?: string[];
  provider: {
    name: string;
    url: string;
  };
  datePublished?: string;
  author?: {
    name: string;
  };
}

export function LearningResourceStructuredData({
  name,
  description,
  url,
  educationalLevel,
  learningResourceType,
  teaches = [],
  about = [],
  provider,
  datePublished,
  author,
}: LearningResourceStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name,
    description,
    url,
    educationalLevel,
    learningResourceType,
    ...(teaches.length > 0 && { teaches }),
    ...(about.length > 0 && { about }),
    provider: {
      "@type": "Organization",
      name: provider.name,
      url: provider.url,
    },
    ...(datePublished && { datePublished }),
    ...(author && {
      author: {
        "@type": "Person",
        name: author.name,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

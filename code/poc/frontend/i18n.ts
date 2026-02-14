import { getRequestConfig } from 'next-intl/server';

export const locales = ['pt-BR', 'en'] as const;
export const defaultLocale = 'pt-BR';

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale is valid
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;
  
  console.log('=== i18n.ts loading for locale:', validLocale);

  // Load all translation files and merge them
  const [
    common, 
    auth, 
    recommendations, 
    rewards, 
    errors, 
    feed, 
    community, 
    discover, 
    create, 
    landing, 
    profile,
    savedLists,
    social,
    restaurant,
    restaurantCard,
    legal,
    onboarding,
    tips,
    myRewards,
  ] = await Promise.all([
    import(`./locales/${validLocale}/common.json`),
    import(`./locales/${validLocale}/auth.json`),
    import(`./locales/${validLocale}/recommendations.json`),
    import(`./locales/${validLocale}/rewards.json`),
    import(`./locales/${validLocale}/errors.json`),
    import(`./locales/${validLocale}/feed.json`),
    import(`./locales/${validLocale}/community.json`),
    import(`./locales/${validLocale}/discover.json`),
    import(`./locales/${validLocale}/create.json`),
    import(`./locales/${validLocale}/landing.json`),
    import(`./locales/${validLocale}/profile.json`),
    import(`./locales/${validLocale}/savedLists.json`),
    import(`./locales/${validLocale}/social.json`),
    import(`./locales/${validLocale}/restaurant.json`),
    import(`./locales/${validLocale}/restaurantCard.json`),
    import(`./locales/${validLocale}/legal.json`),
    import(`./locales/${validLocale}/onboarding.json`),
    import(`./locales/${validLocale}/tips.json`),
    import(`./locales/${validLocale}/myRewards.json`),
  ]);

  console.log('=== landing.default keys:', Object.keys(landing.default));
  console.log('=== landing.default.problem:', landing.default.problem);

  return {
    locale: validLocale,
    messages: {
      ...common.default,
      auth: auth.default,
      recommendations: recommendations.default,
      rewards: rewards.default,
      errors: errors.default,
      feed: feed.default,
      community: community.default,
      discover: discover.default,
      discovery: discover.default,  
      create: create.default,
      landing: landing.default,
      profile: profile.default.profile,
      profileMap: profile.default.profileMap,
      savedLists: savedLists.default,
      social: social.default,
      restaurant: restaurant.default,
      restaurantCard: restaurantCard.default,
      legal: legal.default,
      onboarding: onboarding.default,
      tips: tips.default,
      myRewards: myRewards.default,
    }
  };
});
const translations = {
  en: {
    appName: 'UpDown',
    chats: 'Chats',
    groups: 'Groups',
    noChats: 'No chats yet',
    findFriends: 'Find Friends',
    message: 'Message',
    online: 'Online',
    offline: 'Offline',
    typing: 'typing...',
    settings: 'Settings',
    logout: 'Logout',
    editProfile: 'Edit Profile',
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    accept: 'Accept',
    decline: 'Decline',
    createGroup: 'Create Group',
    groupName: 'Group Name',
    addMembers: 'Add Members',
    search: 'Search...',
    cancel: 'Cancel',
    save: 'Save',
  },
  bn: {
    appName: 'আপডাউন',
    chats: 'চ্যাট',
    groups: 'গ্রুপ',
    noChats: 'এখনো কোনো চ্যাট নেই',
    findFriends: 'বন্ধু খুঁজুন',
    message: 'মেসেজ',
    online: 'অনলাইন',
    offline: 'অফলাইন',
    typing: 'টাইপ করছে...',
    settings: 'সেটিংস',
    logout: 'লগআউট',
    editProfile: 'প্রোফাইল এডিট',
    notifications: 'নোটিফিকেশন',
    noNotifications: 'কোনো নোটিফিকেশন নেই',
    accept: 'গ্রহণ করুন',
    decline: 'প্রত্যাখ্যান',
    createGroup: 'গ্রুপ তৈরি',
    groupName: 'গ্রুপের নাম',
    addMembers: 'মেম্বার যোগ করুন',
    search: 'খুঁজুন...',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ',
  },
};

let currentLang = localStorage.getItem('updown_lang') || 'en';

export const setLanguage = (lang) => {
  currentLang = lang;
  localStorage.setItem('updown_lang', lang);
};

export const getLanguage = () => currentLang;

export const t = (key) => {
  return translations[currentLang]?.[key] || translations.en[key] || key;
};

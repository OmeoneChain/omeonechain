// File: code/poc/frontend/lib/services/contact-service.ts
// Service for accessing device contacts via Capacitor and finding friends on BocaBoca
// Supports international phone number formats

import { Capacitor } from '@capacitor/core';

// Types for the Contacts plugin (we'll import dynamically to avoid SSR issues)
interface PhoneNumber {
  type?: string;
  label?: string;
  number?: string;
}

interface Contact {
  contactId?: string;
  displayName?: string;
  phoneNumbers?: PhoneNumber[];
  emails?: { address?: string }[];
}

interface ContactsResult {
  contacts: Contact[];
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jfxqjp-3001.app.github.dev';

// Result types
export interface MatchedContact {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followers_count: number;
  recommendations_count: number;
  is_following: boolean;
  contact_name?: string; // Original name from device contacts
}

export interface FindFriendsResult {
  success: boolean;
  matches: MatchedContact[];
  totalContactsScanned: number;
  error?: string;
}

export interface ContactPermissionStatus {
  granted: boolean;
  denied: boolean;
  canAsk: boolean;
}

/**
 * Check if we're running in a native Capacitor context
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check contact permission status
 */
export async function checkContactPermission(): Promise<ContactPermissionStatus> {
  if (!isNativeApp()) {
    return { granted: false, denied: false, canAsk: false };
  }

  try {
    const { Contacts } = await import('@capacitor-community/contacts');
    const status = await Contacts.checkPermissions();
    
    return {
      granted: status.contacts === 'granted',
      denied: status.contacts === 'denied',
      canAsk: status.contacts === 'prompt' || status.contacts === 'prompt-with-rationale'
    };
  } catch (error) {
    console.error('Error checking contact permission:', error);
    return { granted: false, denied: false, canAsk: false };
  }
}

/**
 * Request permission to access contacts
 */
export async function requestContactPermission(): Promise<boolean> {
  if (!isNativeApp()) {
    return false;
  }

  try {
    const { Contacts } = await import('@capacitor-community/contacts');
    const status = await Contacts.requestPermissions();
    return status.contacts === 'granted';
  } catch (error) {
    console.error('Error requesting contact permission:', error);
    return false;
  }
}

/**
 * Normalize a phone number to a standard format for matching
 * Handles international formats, Brazilian specifics, etc.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +, keep as is (already has country code)
  if (normalized.startsWith('+')) {
    return normalized;
  }
  
  // Remove leading zeros (common in some countries for domestic calls)
  normalized = normalized.replace(/^0+/, '');
  
  // Brazilian number handling:
  // - Mobile numbers are 11 digits (2 area code + 9 + 8 digits)
  // - Landlines are 10 digits (2 area code + 8 digits)
  // - If 11 digits and starts with valid area code, assume Brazilian mobile
  if (normalized.length === 11 && /^[1-9][1-9]9/.test(normalized)) {
    return `+55${normalized}`;
  }
  
  // If 10 digits, could be Brazilian landline or US number
  // We'll return without country code and let backend try multiple matches
  if (normalized.length === 10) {
    // Could be Brazilian landline (+55) or US/Canada (+1)
    // Return both possibilities for the backend to check
    return normalized;
  }
  
  // If 9 digits (Brazilian mobile without area code), we can't reliably add country code
  // Return as-is
  
  return normalized;
}

/**
 * Extract all phone numbers from device contacts
 */
export async function getDeviceContacts(): Promise<{ name: string; phones: string[] }[]> {
  if (!isNativeApp()) {
    throw new Error('Contacts are only available in the native app');
  }

  try {
    const { Contacts } = await import('@capacitor-community/contacts');
    
    const result: ContactsResult = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
      }
    });

    // Process contacts and extract phone numbers
    const contactsWithPhones: { name: string; phones: string[] }[] = [];

    for (const contact of result.contacts) {
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const phones = contact.phoneNumbers
          .map(p => p.number)
          .filter((p): p is string => !!p)
          .map(normalizePhoneNumber)
          .filter(p => p.length >= 8); // Filter out obviously invalid numbers

        if (phones.length > 0) {
          contactsWithPhones.push({
            name: contact.displayName || 'Unknown',
            phones: [...new Set(phones)] // Remove duplicates
          });
        }
      }
    }

    return contactsWithPhones;
  } catch (error) {
    console.error('Error getting device contacts:', error);
    throw error;
  }
}

/**
 * Find BocaBoca users that match the user's contacts
 */
export async function findFriendsFromContacts(
  authToken: string
): Promise<FindFriendsResult> {
  try {
    // Check/request permission
    const permission = await checkContactPermission();
    
    if (!permission.granted) {
      if (permission.canAsk) {
        const granted = await requestContactPermission();
        if (!granted) {
          return {
            success: false,
            matches: [],
            totalContactsScanned: 0,
            error: 'Contact permission was denied'
          };
        }
      } else if (permission.denied) {
        return {
          success: false,
          matches: [],
          totalContactsScanned: 0,
          error: 'Contact permission was previously denied. Please enable it in Settings.'
        };
      } else {
        return {
          success: false,
          matches: [],
          totalContactsScanned: 0,
          error: 'Contacts are only available in the mobile app'
        };
      }
    }

    // Get contacts from device
    const contacts = await getDeviceContacts();
    
    if (contacts.length === 0) {
      return {
        success: true,
        matches: [],
        totalContactsScanned: 0,
        error: undefined
      };
    }

    // Flatten all phone numbers with contact names for reference
    const phoneToName: Record<string, string> = {};
    const allPhones: string[] = [];
    
    for (const contact of contacts) {
      for (const phone of contact.phones) {
        if (!phoneToName[phone]) {
          phoneToName[phone] = contact.name;
          allPhones.push(phone);
        }
      }
    }

    // Send to backend for matching
    const response = await fetch(`${API_BASE_URL}/api/users/find-by-phones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        phones: allPhones
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Attach contact names to matches
    const matchesWithContactNames: MatchedContact[] = (data.users || []).map((user: MatchedContact & { matched_phone?: string }) => ({
      ...user,
      contact_name: user.matched_phone ? phoneToName[user.matched_phone] : undefined
    }));

    return {
      success: true,
      matches: matchesWithContactNames,
      totalContactsScanned: contacts.length,
      error: undefined
    };

  } catch (error: any) {
    console.error('Error finding friends from contacts:', error);
    return {
      success: false,
      matches: [],
      totalContactsScanned: 0,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Utility to format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  // Remove + and format nicely
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian format: +55 11 99999-9999
  if (digits.startsWith('55') && digits.length === 13) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  
  // US/Canada format: +1 (555) 555-5555
  if (digits.startsWith('1') && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Generic: just add + if not present
  return phone.startsWith('+') ? phone : `+${phone}`;
}
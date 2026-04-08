// utils/firestoreUtils.ts
import { Timestamp } from "firebase/firestore";

/**
 * Convencion de conversão de tipos para o Firestore.
 * Converte recursivamente todos os objetos Date em Firestore Timestamps.
 */
export const processPayloadForFirestore = (obj: any): any => {
    if (obj instanceof Date) {
        return Timestamp.fromDate(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => processPayloadForFirestore(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = processPayloadForFirestore(obj[key]);
                if (value !== undefined) {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    return obj;
};

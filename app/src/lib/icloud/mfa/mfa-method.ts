import {AxiosResponse} from 'axios';
import {iCloudError, iCloudWarning} from '../../../app/error-types.js';
import * as ICLOUD from '../constants.js';

/**
 * Indicating, which MFA method should be used
 */
export enum MFAMethodType {
    DEVICE = 1,
    SMS = 2,
    VOICE = 3
}

export class MFAMethod {
    type: MFAMethodType;
    numberId: number;

    /**
     * Creates a new MFAMethod object to hold status information
     * @param mfaMethod - The method to be used. Defaults to `device`
     * @param numberId - The number id used for sending sms or voice codes. Defaults to 1
     */
    constructor(mfaMethod: `device` | `voice` | `sms` = `device`, numberId: number = 1) {
        this.update(mfaMethod, numberId);
    }

    /**
     * Updates this object to the given method and number id
     * @param mfaMethod - The method to be used. Defaults to `device`
     * @param numberId - The number id used for sending sms or voice codes. Defaults to 1
     */
    update(mfaMethod: `device` | `voice` | `sms` | string = `device`, numberId: number = 1) {
        switch (mfaMethod) {
        case `sms`:
            this.type = MFAMethodType.SMS;
            this.numberId = numberId;
            break;
        case `voice`:
            this.type = MFAMethodType.VOICE;
            this.numberId = numberId;
            break;
        default:
        case `device`:
            this.type = MFAMethodType.DEVICE;
            this.numberId = undefined;
            break;
        }
    }

    /**
     *
     * @returns True, if the 'device' method is active
     */
    isDevice(): boolean {
        return this.type === MFAMethodType.DEVICE;
    }

    /**
     *
     * @returns True, if the 'sms' method is active
     */
    isSMS(): boolean {
        return this.type === MFAMethodType.SMS;
    }

    /**
     *
     * @returns True, if the 'voice' method is active
     */
    isVoice(): boolean {
        return this.type === MFAMethodType.VOICE;
    }

    /**
     *
     * @returns A string representation of this object
     */
    toString(): string {
        switch (this.type) {
        case MFAMethodType.SMS:
            return `'SMS' (Number ID: ${this.numberId})`;
        case MFAMethodType.VOICE:
            return `'Voice' (Number ID: ${this.numberId})`;
        default:
        case MFAMethodType.DEVICE:
            return `'Device'`;
        }
    }

    /**
     *
     * @returns The appropriate URL endpoint for resending the code, given the currently selected MFA Method
     */
    getResendURL(): string {
        switch (this.type) {
        case MFAMethodType.VOICE:
        case MFAMethodType.SMS:
            return ICLOUD.URL.MFA_PHONE;
        default:
        case MFAMethodType.DEVICE:
            return ICLOUD.URL.MFA_DEVICE;
        }
    }

    /**
     *
     * @returns The appropriate data for resending the code, given the currently selected MFA Method
     */
    getResendPayload(): any {
        switch (this.type) {
        case MFAMethodType.VOICE:
            return {
                "phoneNumber": {
                    "id": this.numberId,
                },
                "mode": `voice`,
            };
        case MFAMethodType.SMS:
            return {
                "phoneNumber": {
                    "id": this.numberId,
                },
                "mode": `sms`,
            };
        default:
        case MFAMethodType.DEVICE:
            return undefined;
        }
    }

    /**
     *
     * @param res - The response received from the backend
     * @returns True, if the response was successful, based on the currently selected MFA Method
     */
    resendSuccessful(res: AxiosResponse<any, any>) {
        const {status} = res;
        switch (this.type) {
        case MFAMethodType.VOICE:
        case MFAMethodType.SMS:
            return status === 200;
        default:
        case MFAMethodType.DEVICE:
            return status === 202;
        }
    }

    /**
     * Will take the Axios Error returned from the backend, and provide a user-readable string
     * @param err - The error returned
     * @returns A iCloudWarning indicating the underlying issue
     */
    processResendError(err: any): iCloudError {
        if (!(err.name === `AxiosError`) || !err.response) {
            return new iCloudWarning(`No response received`).addCause(err);
        }

        if (err.response.status === 403) {
            return new iCloudWarning(`Timeout`).addCause(err);
        }

        if (err.response.status === 412) {
            if (!err.response.data) {
                return new iCloudWarning(`Bad request, no response data`).addCause(err);
            }

            if (this.type === MFAMethodType.SMS || this.type === MFAMethodType.VOICE) {
                const trustedPhones = (err.response.data as any).trustedPhoneNumbers;
                if (!trustedPhones
                    || !Array.isArray(trustedPhones)
                    || trustedPhones.length === 0) {
                    return new iCloudWarning(`No trusted phone numbers registered`)
                        .addContext(`response.data`, err.response.data)
                        .addCause(err);
                }

                if (!trustedPhones.some(number => number.id === this.numberId)) {
                    return new iCloudWarning(`Selected Phone Number ID does not exist.\nAvailable numbers:\n${trustedPhones.map(number => `- ${number.id}: ${number.numberWithDialCode}`).join(`\n`)}`)
                        .addContext(`response.data`, err.response.data)
                        .addCause(err);
                }
            }
        }

        return new iCloudWarning(`Bad request, unknown cause with method ${this}`)
            .addCause(err);
    }

    /**
     * @param mfa - The MFA code, that should be send for validation
     * @returns The appropriate payload for entering the code, given the currently selected MFA Method
     */
    getEnterPayload(mfa: string): any {
        switch (this.type) {
        case MFAMethodType.VOICE:
            return {
                "securityCode": {
                    "code": `${mfa}`,
                },
                "phoneNumber": {
                    "id": this.numberId,
                },
                "mode": `voice`,
            };
        case MFAMethodType.SMS:
            return {
                "securityCode": {
                    "code": `${mfa}`,
                },
                "phoneNumber": {
                    "id": this.numberId,
                },
                "mode": `sms`,
            };
        default:
        case MFAMethodType.DEVICE:
            return {
                "securityCode": {
                    "code": `${mfa}`,
                },
            };
        }
    }

    /**
     *
     * @returns The appropriate URL endpoint for entering the code, given the currently selected MFA Method
     */
    getEnterURL(): string {
        switch (this.type) {
        case MFAMethodType.VOICE:
        case MFAMethodType.SMS:
            return ICLOUD.URL.MFA_PHONE_ENTER;
        default:
        case MFAMethodType.DEVICE:
            return ICLOUD.URL.MFA_DEVICE_ENTER;
        }
    }

    /**
     *
     * @param res - The response received from the backend
     * @returns True, if the response was successful, based on the currently selected MFA Method
     */
    enterSuccessful(res: AxiosResponse<any, any>) {
        const {status} = res;
        switch (this.type) {
        case MFAMethodType.VOICE:
        case MFAMethodType.SMS:
            return status === 200;
        default:
        case MFAMethodType.DEVICE:
            return status === 204;
        }
    }
}
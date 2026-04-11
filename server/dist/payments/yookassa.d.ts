/**
 * Creates a YooKassa payment link.
 */
export declare function createPayment(amount: number, currency: string, description: string, returnUrl: string): Promise<{
    id: string;
    confirmation_url: string;
}>;
/**
 * Checks YooKassa payment status by ID.
 */
export declare function verifyPayment(paymentId: string): Promise<{
    status: string;
    amount: number;
}>;
/**
 * Processes a YooKassa webhook notification.
 * Verifies the HMAC-SHA256 signature if a secret key is present,
 * then extracts event, paymentId, and status from the body.
 */
export declare function handleWebhook(body: any, signature: string | undefined): Promise<{
    event: string;
    paymentId: string;
    status: string;
}>;

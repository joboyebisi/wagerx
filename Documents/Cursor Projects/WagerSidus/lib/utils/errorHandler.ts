/**
 * Comprehensive Error Handling Utilities
 * Provides user-friendly error messages and error tracking
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
}

export class ErrorHandler {
  /**
   * Parse blockchain/contract errors into user-friendly messages
   */
  static parseContractError(error: any): AppError {
    const errorMessage = error?.message || error?.reason || String(error);
    const errorCode = error?.code || 'UNKNOWN_ERROR';

    // Common contract errors
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient payment')) {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: errorMessage,
        userMessage: 'You don\'t have enough BNB to complete this transaction. Please add more BNB to your wallet.',
      };
    }

    if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
      return {
        code: 'USER_REJECTED',
        message: errorMessage,
        userMessage: 'Transaction was cancelled. Please try again when ready.',
      };
    }

    if (errorMessage.includes('Not a participant')) {
      return {
        code: 'NOT_PARTICIPANT',
        message: errorMessage,
        userMessage: 'You are not a participant in this wager.',
      };
    }

    if (errorMessage.includes('Wager not pending') || errorMessage.includes('Wager not active')) {
      return {
        code: 'INVALID_STATUS',
        message: errorMessage,
        userMessage: 'This wager is not in the correct status for this action.',
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('Network')) {
      return {
        code: 'NETWORK_ERROR',
        message: errorMessage,
        userMessage: 'Network error. Please check your connection and try again.',
      };
    }

    if (errorMessage.includes('gas') || errorMessage.includes('Gas')) {
      return {
        code: 'GAS_ERROR',
        message: errorMessage,
        userMessage: 'Transaction failed due to gas issues. Please try again.',
      };
    }

    // Default error
    return {
      code: errorCode,
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
    };
  }

  /**
   * Parse API errors
   */
  static parseAPIError(error: any): AppError {
    const errorMessage = error?.message || String(error);
    const statusCode = error?.status || error?.response?.status;

    if (statusCode === 400) {
      return {
        code: 'BAD_REQUEST',
        message: errorMessage,
        userMessage: 'Invalid request. Please check your input and try again.',
      };
    }

    if (statusCode === 401 || statusCode === 403) {
      return {
        code: 'UNAUTHORIZED',
        message: errorMessage,
        userMessage: 'You are not authorized to perform this action.',
      };
    }

    if (statusCode === 404) {
      return {
        code: 'NOT_FOUND',
        message: errorMessage,
        userMessage: 'The requested resource was not found.',
      };
    }

    if (statusCode === 500) {
      return {
        code: 'SERVER_ERROR',
        message: errorMessage,
        userMessage: 'Server error. Please try again later.',
      };
    }

    return {
      code: 'API_ERROR',
      message: errorMessage,
      userMessage: 'An error occurred while processing your request. Please try again.',
    };
  }

  /**
   * Log error for debugging
   */
  static logError(error: AppError, context?: string) {
    console.error(`[${context || 'Error'}]`, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  /**
   * Format error for display
   */
  static formatError(error: any, context?: string): AppError {
    // Try contract error first
    if (error?.reason || error?.code?.toString().startsWith('4')) {
      return this.parseContractError(error);
    }

    // Try API error
    if (error?.response || error?.status) {
      return this.parseAPIError(error);
    }

    // Default parsing
    return this.parseContractError(error);
  }
}


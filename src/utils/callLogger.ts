/**
 * Centralized Call Logger Utility
 * Provides consistent logging for voice call operations with timestamps and categorization
 */

type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG' | 'WEBRTC' | 'SIGNALR';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
}

class CallLogger {
    private enabled: boolean = true;
    private logHistory: LogEntry[] = [];
    private maxHistorySize: number = 100;

    /**
     * Enable or disable logging
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (enabled) {
            console.log('[CallLogger] Logging enabled');
        }
    }

    /**
     * Get log history
     */
    getHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    /**
     * Clear log history
     */
    clearHistory(): void {
        this.logHistory = [];
    }

    /**
     * Internal log method
     */
    private log(level: LogLevel, message: string, data?: any): void {
        if (!this.enabled) return;

        const timestamp = new Date().toISOString();
        const logEntry: LogEntry = { timestamp, level, message, data };

        // Add to history
        this.logHistory.push(logEntry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }

        // Format console output
        const prefix = `[CallLogger] [${level}] [${new Date().toLocaleTimeString()}]`;
        const style = this.getConsoleStyle(level);

        if (data !== undefined) {
            console.log(`%c${prefix} ${message}`, style, data);
        } else {
            console.log(`%c${prefix} ${message}`, style);
        }
    }

    /**
     * Get console styling based on log level
     */
    private getConsoleStyle(level: LogLevel): string {
        switch (level) {
            case 'INFO':
                return 'color: #2563eb; font-weight: bold;';
            case 'WARNING':
                return 'color: #ea580c; font-weight: bold;';
            case 'ERROR':
                return 'color: #dc2626; font-weight: bold;';
            case 'DEBUG':
                return 'color: #64748b; font-weight: normal;';
            case 'WEBRTC':
                return 'color: #16a34a; font-weight: bold;';
            case 'SIGNALR':
                return 'color: #9333ea; font-weight: bold;';
            default:
                return 'color: #000000;';
        }
    }

    // Public logging methods

    /**
     * Log general information
     */
    info(message: string, data?: any): void {
        this.log('INFO', message, data);
    }

    /**
     * Log warnings
     */
    warning(message: string, data?: any): void {
        this.log('WARNING', message, data);
    }

    /**
     * Log errors
     */
    error(message: string, data?: any): void {
        this.log('ERROR', message, data);
    }

    /**
     * Log debug information (can be filtered out in production)
     */
    debug(message: string, data?: any): void {
        this.log('DEBUG', message, data);
    }

    /**
     * Log WebRTC-specific events
     */
    webrtc(message: string, data?: any): void {
        this.log('WEBRTC', message, data);
    }

    /**
     * Log SignalR-specific events
     */
    signalr(message: string, data?: any): void {
        this.log('SIGNALR', message, data);
    }

    // Specialized logging methods for common scenarios

    /**
     * Log call state transition
     */
    stateTransition(from: string, to: string, callId?: string): void {
        this.info(`Call state transition: ${from} → ${to}`, { callId });
    }

    /**
     * Log API call
     */
    apiCall(method: string, endpoint: string, data?: any): void {
        this.debug(`API ${method} ${endpoint}`, data);
    }

    /**
     * Log API response
     */
    apiResponse(endpoint: string, success: boolean, data?: any): void {
        if (success) {
            this.debug(`API Response Success: ${endpoint}`, data);
        } else {
            this.error(`API Response Error: ${endpoint}`, data);
        }
    }

    /**
     * Log SDP Offer/Answer
     */
    sdp(type: 'offer' | 'answer', action: 'created' | 'sent' | 'received' | 'applied', callId: string): void {
        this.webrtc(`SDP ${type} ${action}`, { callId });
    }

    /**
     * Log ICE candidate event
     */
    iceCandidate(action: 'gathered' | 'sent' | 'received' | 'added', candidate?: any): void {
        this.webrtc(`ICE candidate ${action}`, candidate ? {
            type: candidate.type,
            protocol: candidate.protocol,
            address: candidate.address
        } : undefined);
    }

    /**
     * Log connection state change
     */
    connectionState(state: string, callId?: string): void {
        this.webrtc(`WebRTC connection state: ${state}`, { callId });
    }

    /**
     * Log media stream event
     */
    mediaStream(action: 'acquired' | 'added' | 'removed' | 'stopped', trackInfo?: any): void {
        this.webrtc(`Media stream ${action}`, trackInfo);
    }

    /**
     * Log SignalR connection event
     */
    signalrConnection(state: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'reconnected'): void {
        this.signalr(`SignalR connection ${state}`);
    }

    /**
     * Log SignalR event received
     */
    signalrEvent(eventName: string, payload?: any): void {
        this.signalr(`Event received: ${eventName}`, payload);
    }

    /**
     * Log SignalR method invocation
     */
    signalrInvoke(methodName: string, args?: any): void {
        this.signalr(`Invoking method: ${methodName}`, args);
    }
}

// Export singleton instance
export const callLogger = new CallLogger();

// Also export the class for testing
export default CallLogger;

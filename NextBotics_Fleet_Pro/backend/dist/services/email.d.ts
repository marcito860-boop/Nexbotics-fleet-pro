export declare const sendRequisitionRequest: (staffName: string, details: any) => Promise<{
    success: boolean;
    messageId: string;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    messageId?: undefined;
}>;
export declare const sendApprovalNotification: (staffName: string, status: "approved" | "rejected", reason?: string) => Promise<{
    success: boolean;
}>;
export declare const sendVehicleAllocated: (staffName: string, vehicleReg: string, driverName: string) => Promise<{
    success: boolean;
}>;
export declare const sendInspectionNotification: (vehicleReg: string, driverName: string, passed: boolean) => Promise<{
    success: boolean;
}>;
export declare const sendTripCompleted: (staffName: string, vehicleReg: string, distance: number) => Promise<{
    success: boolean;
}>;
export declare const sendMaintenanceNotification: (vehicleReg: string, driverName: string, defects: string) => Promise<{
    success: boolean;
}>;
declare const _default: {
    sendRequisitionRequest: (staffName: string, details: any) => Promise<{
        success: boolean;
        messageId: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        messageId?: undefined;
    }>;
    sendApprovalNotification: (staffName: string, status: "approved" | "rejected", reason?: string) => Promise<{
        success: boolean;
    }>;
    sendVehicleAllocated: (staffName: string, vehicleReg: string, driverName: string) => Promise<{
        success: boolean;
    }>;
    sendInspectionNotification: (vehicleReg: string, driverName: string, passed: boolean) => Promise<{
        success: boolean;
    }>;
    sendTripCompleted: (staffName: string, vehicleReg: string, distance: number) => Promise<{
        success: boolean;
    }>;
    sendMaintenanceNotification: (vehicleReg: string, driverName: string, defects: string) => Promise<{
        success: boolean;
    }>;
};
export default _default;
//# sourceMappingURL=email.d.ts.map
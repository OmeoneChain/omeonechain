import { NextRequest } from 'next/server';
/**
 * POST /api/recommendations
 * Create a new recommendation with comprehensive validation
 */
export declare function POST(request: NextRequest): Promise<any>;
/**
 * GET /api/recommendations
 * List recommendations with advanced filtering and Trust Score calculation
 */
export declare function GET(request: NextRequest): Promise<any>;
/**
 * PUT /api/recommendations
 * Update a recommendation (for future implementation)
 */
export declare function PUT(request: NextRequest): Promise<any>;
/**
 * DELETE /api/recommendations
 * Delete a recommendation (for future implementation)
 */
export declare function DELETE(request: NextRequest): Promise<any>;

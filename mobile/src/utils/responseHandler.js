/**
 * Utility functions for handling API responses consistently
 * The backend has inconsistent response formats, so we need to handle both:
 * - Wrapped format: { success: true, data: ... }
 * - Direct format: direct arrays/objects
 */

/**
 * Extract data from API response, handling both wrapped and direct formats
 * @param {Object} response - Axios response object
 * @returns {*} - Extracted data (could be array, object, or primitive)
 */
export const extractResponseData = (response) => {
  const data = response.data;
  
  // Handle wrapped format: { success: true, data: ... }
  if (data?.success === true && 'data' in data) {
    return data.data;
  }
  
  // Handle error response: { success: false, error: ... }
  if (data?.success === false) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  
  // Handle direct format (arrays, objects, primitives)
  return data;
};

/**
 * Extract data from response with fallback handling
 * Useful for endpoints that might return different formats
 * @param {Object} response - Axios response object
 * @param {*} fallback - Fallback value if extraction fails
 * @returns {*} - Extracted data or fallback
 */
export const extractResponseDataWithFallback = (response, fallback = null) => {
  try {
    const data = extractResponseData(response);
    return data !== undefined && data !== null ? data : fallback;
  } catch (error) {
    if (__DEV__) {
      console.error('[ResponseHandler] Error extracting response data:', error);
    }
    return fallback;
  }
};

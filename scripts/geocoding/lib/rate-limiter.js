/**
 * Rate limiter class for maintaining API call rates within limits
 * Queues function calls and ensures they don't exceed a specified rate
 */
export class RateLimiter {
  /**
   * Create a rate limiter to prevent hitting API limits
   * @param {number} requestsPerMinute - Maximum requests per minute
   */
  constructor(requestsPerMinute) {
    this.queue = [];
    this.processing = false;
    // Calculate delay needed between requests to stay under the limit
    // Add 10% buffer to be safe
    this.delayMs = Math.ceil((60 * 1000) / (requestsPerMinute * 0.9));
    this.lastRequestTime = 0;
  }

  /**
   * Add a function to the rate-limited queue
   * @param {Function} fn - Async function to execute within rate limits
   * @returns {Promise} - Promise that resolves when the function completes
   */
  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject
      });
      
      // Start processing the queue if it's not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue of functions at the specified rate
   * @private
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    // Calculate how long to wait based on when the last request was made
    const now = Date.now();
    const timeToWait = Math.max(0, this.delayMs - (now - this.lastRequestTime));
    
    // Wait if necessary to maintain rate limit
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    // Get the next item from the queue
    const item = this.queue.shift();
    
    // Record the time before making the request
    this.lastRequestTime = Date.now();
    
    try {
      // Execute the function and resolve its promise
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      // If the function throws, reject its promise
      item.reject(error);
    }
    
    // Continue processing the queue
    this.processQueue();
  }
}

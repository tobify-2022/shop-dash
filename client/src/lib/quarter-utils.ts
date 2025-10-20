/**
 * Utility functions for working with fiscal quarters
 */

export interface Quarter {
  year: number;
  quarter: number;
  startDate: string; // YYYY-MM-DD format
  endDate: string;
}

/**
 * Get the current calendar quarter
 * NOTE: BigQuery NRR/IPP tables use CALENDAR quarters, not Shopify fiscal quarters
 */
export function getCurrentQuarter(): Quarter {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Calendar quarters (matching BigQuery DATE_TRUNC behavior):
  // Q1: Jan, Feb, Mar
  // Q2: Apr, May, Jun
  // Q3: Jul, Aug, Sep
  // Q4: Oct, Nov, Dec

  let quarter: number;
  let startDate: string;
  let endDate: string;

  if (month >= 1 && month <= 3) {
    // Q1
    quarter = 1;
    startDate = `${year}-01-01`;
    endDate = `${year}-03-31`;
  } else if (month >= 4 && month <= 6) {
    // Q2
    quarter = 2;
    startDate = `${year}-04-01`;
    endDate = `${year}-06-30`;
  } else if (month >= 7 && month <= 9) {
    // Q3
    quarter = 3;
    startDate = `${year}-07-01`;
    endDate = `${year}-09-30`;
  } else {
    // Q4 (Oct, Nov, Dec)
    quarter = 4;
    startDate = `${year}-10-01`;
    endDate = `${year}-12-31`;
  }

  return { year, quarter, startDate, endDate };
}

/**
 * Format quarter for display (e.g., "Q4 2025")
 */
export function formatQuarter(quarter: Quarter): string {
  return `Q${quarter.quarter} ${quarter.year}`;
}

/**
 * Get quarter start date for BigQuery filtering (first day of quarter)
 */
export function getQuarterStartDate(quarter: Quarter): string {
  return quarter.startDate;
}


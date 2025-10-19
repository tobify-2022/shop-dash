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
 * Get the current fiscal quarter (Shopify fiscal year starts in February)
 */
export function getCurrentQuarter(): Quarter {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Shopify fiscal year: Feb-Jan
  // Q1: Feb, Mar, Apr
  // Q2: May, Jun, Jul
  // Q3: Aug, Sep, Oct
  // Q4: Nov, Dec, Jan

  let fiscalYear = year;
  let quarter: number;
  let startDate: string;
  let endDate: string;

  if (month >= 2 && month <= 4) {
    // Q1
    quarter = 1;
    startDate = `${year}-02-01`;
    endDate = `${year}-04-30`;
  } else if (month >= 5 && month <= 7) {
    // Q2
    quarter = 2;
    startDate = `${year}-05-01`;
    endDate = `${year}-07-31`;
  } else if (month >= 8 && month <= 10) {
    // Q3
    quarter = 3;
    startDate = `${year}-08-01`;
    endDate = `${year}-10-31`;
  } else {
    // Q4 (Nov, Dec, Jan)
    quarter = 4;
    if (month === 1) {
      // January is part of previous year's Q4
      fiscalYear = year - 1;
      startDate = `${fiscalYear}-11-01`;
      endDate = `${year}-01-31`;
    } else {
      // Nov or Dec
      startDate = `${year}-11-01`;
      endDate = `${year + 1}-01-31`;
    }
  }

  return { year: fiscalYear, quarter, startDate, endDate };
}

/**
 * Format quarter for display (e.g., "Q3 FY2025")
 */
export function formatQuarter(quarter: Quarter): string {
  return `Q${quarter.quarter} FY${quarter.year}`;
}

/**
 * Get quarter start date for BigQuery filtering (first day of quarter)
 */
export function getQuarterStartDate(quarter: Quarter): string {
  return quarter.startDate;
}


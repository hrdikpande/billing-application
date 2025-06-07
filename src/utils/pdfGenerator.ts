import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Bill, User } from '../types';
import toast from 'react-hot-toast';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Enhanced PDF generation with proper data handling
export const generateA5BillPDF = (bill: Bill, businessInfo: User): jsPDF => {
  try {
    // Validate input data
    if (!bill || !businessInfo) {
      throw new Error('Missing bill or business information');
    }

    if (!bill.items || !Array.isArray(bill.items) || bill.items.length === 0) {
      throw new Error('No items found in the bill');
    }

    // A4 dimensions for better readability: 210 × 297 mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    let yPosition = margin;

    // Helper functions
    const safeText = (value: any): string => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };

    const safeNumber = (value: any): number => {
      if (value === null || value === undefined || isNaN(Number(value))) return 0;
      return Number(value);
    };

    const formatCurrency = (amount: number): string => {
      return amount.toFixed(2);
    };

    const formatINR = (amount: number): string => {
      return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Header Section - Tax Invoice
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Tax Invoice', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Invoice details box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, contentWidth, 30);

    // Left side - Business details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(businessInfo.businessName).toUpperCase(), margin + 3, yPosition + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const businessAddress = [
      safeText(businessInfo.address),
      `${safeText(businessInfo.city)}, ${safeText(businessInfo.state)} - ${safeText(businessInfo.zipCode)}`,
      `GSTIN/UIN: ${safeText(businessInfo.taxId) || 'N/A'}`,
      `State Name: ${safeText(businessInfo.state)}, Code: 09`,
      `Contact: ${safeText(businessInfo.phone)}`,
      `E-Mail: ${safeText(businessInfo.email)}`
    ];

    let addressY = yPosition + 10;
    businessAddress.forEach(line => {
      if (line.trim()) {
        doc.text(line, margin + 3, addressY);
        addressY += 3.5;
      }
    });

    // Right side - Invoice details
    const rightX = pageWidth - 85;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const invoiceDetails = [
      ['Invoice No.:', safeText(bill.billNumber)],
      ['Dated:', new Date(bill.createdAt).toLocaleDateString('en-GB')],
      ['Delivery Note:', ''],
      ['Mode/Terms of Payment:', bill.paymentMode || 'Cash'],
      ['Reference No. & Date:', ''],
      ['Other References:', ''],
      ['Buyer\'s Order No.:', ''],
      ['Dated:', ''],
      ['Dispatch Doc No.:', ''],
      ['Delivery Note Date:', '']
    ];

    let detailY = yPosition + 4;
    invoiceDetails.forEach(([label, value]) => {
      doc.text(label, rightX, detailY);
      doc.text(value, rightX + 40, detailY);
      detailY += 2.8;
    });

    yPosition += 33;

    // Customer Information Section
    doc.rect(margin, yPosition, contentWidth, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Consignee (Ship to)', margin + 3, yPosition + 5);
    doc.text('Buyer (Bill to)', rightX, yPosition + 5);

    // Customer details
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(bill.customer.name).toUpperCase(), margin + 3, yPosition + 9);
    
    doc.setFont('helvetica', 'normal');
    const customerDetails = [
      safeText(bill.customer.address) || 'Address not provided',
      `Phone: ${safeText(bill.customer.phone)}`,
      bill.customer.email ? `Email: ${safeText(bill.customer.email)}` : '',
      bill.customer.gstin ? `GSTIN/UIN: ${safeText(bill.customer.gstin)}` : ''
    ];

    let custY = yPosition + 12;
    customerDetails.forEach(line => {
      if (line.trim()) {
        doc.text(line, margin + 3, custY);
        custY += 3;
      }
    });

    // Dispatch details on right
    doc.text('Dispatched through', rightX, yPosition + 9);
    doc.text('Destination', rightX, yPosition + 12);
    doc.text('Terms of Delivery', rightX, yPosition + 15);

    yPosition += 25;

    // Items Table Header - Updated structure
    const tableHeaders = [
      'S.No.',
      'Name',
      'Code',
      'Quantity',
      'Price',
      'Amount'
    ];

    // Calculate column widths - optimized for content
    const colWidths = [18, 65, 30, 22, 25, 30];
    let currentX = margin;

    // Draw table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, contentWidth, 10, 'F');
    doc.rect(margin, yPosition, contentWidth, 10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    tableHeaders.forEach((header, index) => {
      doc.text(header, currentX + 2, yPosition + 6);
      if (index < colWidths.length - 1) {
        doc.line(currentX + colWidths[index], yPosition, currentX + colWidths[index], yPosition + 10);
      }
      currentX += colWidths[index];
    });

    yPosition += 10;

    // Items Table Body - Display actual products with proper data handling
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let itemTotal = 0;
    let totalDiscount = 0;

    console.log('Processing bill items:', bill.items);

    // Process each item with proper error handling
    bill.items.forEach((item, index) => {
      try {
        const rowHeight = 14;
        currentX = margin;

        // Validate item data
        if (!item || !item.product) {
          console.warn(`Item ${index + 1} is missing product data:`, item);
          return;
        }

        // Draw row border
        doc.rect(margin, yPosition, contentWidth, rowHeight);

        // S.No.
        doc.text((index + 1).toString(), currentX + 2, yPosition + 8);
        currentX += colWidths[0];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Name (Product Name) - handle long names
        const productName = safeText(item.product.name || '');
        const maxNameLength = 30;
        const displayName = productName.length > maxNameLength 
          ? productName.substring(0, maxNameLength) + '...' 
          : productName;
        doc.text(displayName, currentX + 2, yPosition + 8);
        currentX += colWidths[1];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Code (Product Code)
        const productCode = safeText(item.product.code || '');
        doc.text(productCode, currentX + 2, yPosition + 8);
        currentX += colWidths[2];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Quantity
        const quantity = safeNumber(item.quantity);
        doc.text(quantity.toString(), currentX + 2, yPosition + 8);
        currentX += colWidths[3];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Price (Unit Price) - check multiple possible fields
        const unitPrice = safeNumber(
          item.unitPrice || 
          item.product.unitPrice || 
          item.product.price || 
          0
        );
        doc.text(formatCurrency(unitPrice), currentX + 2, yPosition + 8);
        currentX += colWidths[4];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Amount (Total for this item)
        const itemAmount = safeNumber(item.total || (quantity * unitPrice));
        doc.text(formatCurrency(itemAmount), currentX + 2, yPosition + 8);
        
        // Add to totals
        itemTotal += itemAmount;
        totalDiscount += safeNumber(item.discountAmount || 0);

        yPosition += rowHeight;
        
        console.log(`Processed item ${index + 1}:`, {
          name: productName,
          code: productCode,
          quantity,
          unitPrice,
          amount: itemAmount
        });
        
      } catch (itemError) {
        console.error(`Error processing item ${index + 1}:`, itemError, item);
      }
    });

    // Add empty rows if needed to maintain table structure
    const minRows = 6;
    const currentRows = bill.items.length;
    if (currentRows < minRows) {
      for (let i = currentRows; i < minRows; i++) {
        const rowHeight = 14;
        doc.rect(margin, yPosition, contentWidth, rowHeight);
        
        // Draw vertical lines
        currentX = margin;
        colWidths.forEach((width, index) => {
          if (index < colWidths.length - 1) {
            currentX += width;
            doc.line(currentX, yPosition, currentX, yPosition + rowHeight);
          }
        });
        
        yPosition += rowHeight;
      }
    }

    // Discount row if applicable
    const billDiscountAmount = safeNumber(bill.billDiscountAmount || 0);
    if (totalDiscount > 0 || billDiscountAmount > 0) {
      const rowHeight = 10;
      doc.rect(margin, yPosition, contentWidth, rowHeight);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('Less: Discount', margin + colWidths[0] + 2, yPosition + 6);
      
      const discountPercent = bill.billDiscountType === 'percentage' ? `(${bill.billDiscountValue}%)` : '';
      doc.text(discountPercent, pageWidth - margin - 60, yPosition + 6);
      
      const totalDiscountAmount = totalDiscount + billDiscountAmount;
      doc.text(`(${formatCurrency(totalDiscountAmount)})`, pageWidth - margin - 5, yPosition + 6, { align: 'right' });
      
      yPosition += rowHeight;
    }

    // Total row
    const totalRowHeight = 12;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, contentWidth, totalRowHeight, 'F');
    doc.rect(margin, yPosition, contentWidth, totalRowHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total', pageWidth - margin - 90, yPosition + 8);
    
    const finalTotal = safeNumber(bill.total);
    doc.text(formatINR(finalTotal), pageWidth - margin - 5, yPosition + 8, { align: 'right' });

    yPosition += totalRowHeight + 8;

    // Amount in words
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Amount Chargeable (in words):', margin, yPosition);
    doc.text('E. & O.E', pageWidth - margin - 25, yPosition);
    yPosition += 5;

    // Convert number to words
    const amountInWords = `INR ${numberToWords(Math.floor(finalTotal))} Only`;
    doc.setFont('helvetica', 'bold');
    doc.text(amountInWords, margin, yPosition);
    yPosition += 12;

    // Tax breakdown table (simplified for now)
    const taxTableY = yPosition;
    
    // Tax table headers
    const taxHeaders = ['HSN/SAC', 'Taxable Value', 'IGST Rate', 'IGST Amount', 'Total Tax Amount'];
    const taxColWidths = [25, 35, 25, 30, 35];
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, taxTableY, 150, 8, 'F');
    doc.rect(margin, taxTableY, 150, 8);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    
    let taxX = margin;
    taxHeaders.forEach((header, index) => {
      doc.text(header, taxX + 1, taxTableY + 5);
      if (index < taxHeaders.length - 1) {
        doc.line(taxX + taxColWidths[index], taxTableY, taxX + taxColWidths[index], taxTableY + 8);
      }
      taxX += taxColWidths[index];
    });

    // Tax table body
    const taxRowY = taxTableY + 8;
    const taxRowHeight = 8;
    
    doc.rect(margin, taxRowY, 150, taxRowHeight);
    doc.setFont('helvetica', 'normal');
    
    const taxableAmount = finalTotal;
    const igstRate = 18; // Default GST rate
    const igstAmount = (taxableAmount * igstRate) / (100 + igstRate); // Reverse calculation
    
    taxX = margin;
    const taxData = ['', formatCurrency(taxableAmount - igstAmount), `${igstRate}%`, formatCurrency(igstAmount), formatCurrency(igstAmount)];
    
    taxData.forEach((data, index) => {
      doc.text(data, taxX + 1, taxRowY + 5);
      if (index < taxData.length - 1) {
        doc.line(taxX + taxColWidths[index], taxRowY, taxX + taxColWidths[index], taxRowY + taxRowHeight);
      }
      taxX += taxColWidths[index];
    });

    // Total tax row
    const totalTaxY = taxRowY + taxRowHeight;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, totalTaxY, 150, taxRowHeight, 'F');
    doc.rect(margin, totalTaxY, 150, taxRowHeight);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total', margin + 1, totalTaxY + 5);
    doc.text(formatCurrency(taxableAmount - igstAmount), margin + 60, totalTaxY + 5, { align: 'right' });
    doc.text(formatCurrency(igstAmount), margin + 110, totalTaxY + 5, { align: 'right' });
    doc.text(formatCurrency(igstAmount), margin + 150 - 5, totalTaxY + 5, { align: 'right' });

    yPosition = totalTaxY + taxRowHeight + 12;

    // Tax amount in words
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Tax Amount (in words):', margin, yPosition);
    yPosition += 5;
    
    const taxAmountInWords = igstAmount > 0 
      ? `INR ${numberToWords(Math.floor(igstAmount))} Only`
      : 'INR Zero Only';
    doc.setFont('helvetica', 'bold');
    doc.text(taxAmountInWords, margin, yPosition);
    yPosition += 12;

    // Company bank details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Company\'s Bank Details', margin, yPosition);
    yPosition += 5;
    
    const bankDetails = [
      `A/c Holder's Name: ${safeText(businessInfo.businessName)}`,
      `Bank Name: ${safeText(businessInfo.bankName) || 'Bank Name'}`,
      `A/c No.: ${safeText(businessInfo.accountNumber) || 'Account Number'}`,
      `Branch & IFS Code: ${safeText(businessInfo.swiftCode) || 'IFSC Code'}`
    ];

    bankDetails.forEach(detail => {
      doc.text(detail, margin, yPosition);
      yPosition += 4;
    });

    // Authorization signature
    doc.text('for ' + safeText(businessInfo.businessName).toUpperCase(), pageWidth - margin - 70, yPosition - 8);
    yPosition += 12;
    doc.text('Authorised Signatory', pageWidth - margin - 70, yPosition);

    // Footer
    yPosition = pageHeight - 25;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('This is a Computer Generated Invoice', pageWidth / 2, yPosition, { align: 'center' });

    console.log('PDF generation completed successfully');
    return doc;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to convert numbers to words (enhanced version)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  }

  if (num < 1000) {
    return convertHundreds(num).trim();
  }

  let result = '';
  
  // Handle Indian numbering system
  if (num >= 10000000) { // Crore
    result = convertHundreds(Math.floor(num / 10000000)) + 'Crore ';
    num %= 10000000;
  }
  
  if (num >= 100000) { // Lakh
    result += convertHundreds(Math.floor(num / 100000)) + 'Lakh ';
    num %= 100000;
  }
  
  if (num >= 1000) { // Thousand
    result += convertHundreds(Math.floor(num / 1000)) + 'Thousand ';
    num %= 1000;
  }
  
  if (num > 0) {
    result += convertHundreds(num);
  }
  
  return result.trim();
}

export const downloadBillPDF = async (bill: Bill, businessInfo: User): Promise<void> => {
  try {
    console.log('Starting PDF download for bill:', bill.billNumber);
    console.log('Bill items:', bill.items);
    
    const doc = generateA5BillPDF(bill, businessInfo);
    const fileName = `Invoice_${bill.billNumber || 'bill'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    doc.save(fileName);
    console.log(`PDF downloaded successfully: ${fileName}`);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const printBillPDF = async (bill: Bill, businessInfo: User): Promise<boolean> => {
  try {
    console.log('Starting PDF print for bill:', bill.billNumber);
    
    const doc = generateA5BillPDF(bill, businessInfo);
    
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(blobUrl, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            printWindow.close();
          }, 1000);
        }, 500);
      };
      return true; // Print window opened successfully
    } else {
      URL.revokeObjectURL(blobUrl);
      return false; // Print window was blocked
    }
  } catch (error) {
    console.error('Error printing PDF:', error);
    return false; // Print failed
  }
};

export const generateAndDownloadPDF = async (bill: Bill, businessInfo: User, action: 'download' | 'print' = 'download'): Promise<void> => {
  try {
    // Validate inputs
    if (!bill) {
      toast.error('Bill information is missing');
      throw new Error('Bill information is missing');
    }
    
    if (!businessInfo) {
      toast.error('Business information is missing');
      throw new Error('Business information is missing');
    }
    
    if (!bill.items || !Array.isArray(bill.items) || bill.items.length === 0) {
      toast.error('No items found in the bill');
      throw new Error('No items found in the bill');
    }
    
    console.log(`Starting ${action} for bill:`, bill.billNumber);
    console.log('Bill data:', bill);
    console.log('Business data:', businessInfo);
    
    if (action === 'print') {
      const printSuccess = await printBillPDF(bill, businessInfo);
      if (printSuccess) {
        toast.success('Print dialog opened');
        return;
      } else {
        // Print failed, try download as fallback
        try {
          await downloadBillPDF(bill, businessInfo);
          toast.success('Print failed, but PDF downloaded successfully');
          return;
        } catch (downloadError) {
          toast.error('Both print and download failed. Please try again.');
          throw new Error('Both print and download failed. Please try again.');
        }
      }
    } else {
      await downloadBillPDF(bill, businessInfo);
      toast.success('Bill downloaded successfully');
    }
  } catch (error) {
    console.error(`Error ${action}ing PDF:`, error);
    if (action === 'download') {
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF');
    }
    throw error;
  }
};
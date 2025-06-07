import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Bill, User } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Enhanced PDF generation matching the provided invoice format
export const generateA5BillPDF = (bill: Bill, businessInfo: User): jsPDF => {
  try {
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
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Tax Invoice', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Invoice details box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, contentWidth, 25);

    // Left side - Business details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(businessInfo.businessName).toUpperCase(), margin + 2, yPosition + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const businessAddress = [
      safeText(businessInfo.address),
      `${safeText(businessInfo.city)}, ${safeText(businessInfo.state)} - ${safeText(businessInfo.zipCode)}`,
      `GSTIN/UIN: ${safeText(businessInfo.taxId) || 'N/A'}`,
      `State Name: ${safeText(businessInfo.state)}, Code: 09`,
      `Contact: ${safeText(businessInfo.phone)}`,
      `E-Mail: ${safeText(businessInfo.email)}`
    ];

    let addressY = yPosition + 8;
    businessAddress.forEach(line => {
      if (line.trim()) {
        doc.text(line, margin + 2, addressY);
        addressY += 3;
      }
    });

    // Right side - Invoice details
    const rightX = pageWidth - 80;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const invoiceDetails = [
      ['Invoice No.', safeText(bill.billNumber)],
      ['Dated', new Date(bill.createdAt).toLocaleDateString('en-GB')],
      ['Delivery Note', ''],
      ['Mode/Terms of Payment', bill.paymentMode || 'Cash'],
      ['Reference No. & Date', ''],
      ['Other References', ''],
      ['Buyer\'s Order No.', ''],
      ['Dated', ''],
      ['Dispatch Doc No.', ''],
      ['Delivery Note Date', '']
    ];

    let detailY = yPosition + 3;
    invoiceDetails.forEach(([label, value]) => {
      doc.text(`${label}:`, rightX, detailY);
      doc.text(value, rightX + 35, detailY);
      detailY += 2.5;
    });

    yPosition += 28;

    // Customer Information Section
    doc.rect(margin, yPosition, contentWidth, 20);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Consignee (Ship to)', margin + 2, yPosition + 4);
    doc.text('Buyer (Bill to)', rightX, yPosition + 4);

    // Customer details
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(bill.customer.name).toUpperCase(), margin + 2, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    const customerDetails = [
      safeText(bill.customer.address) || 'Address not provided',
      `Phone: ${safeText(bill.customer.phone)}`,
      bill.customer.email ? `Email: ${safeText(bill.customer.email)}` : '',
      bill.customer.gstin ? `GSTIN/UIN: ${safeText(bill.customer.gstin)}` : ''
    ];

    let custY = yPosition + 11;
    customerDetails.forEach(line => {
      if (line.trim()) {
        doc.text(line, margin + 2, custY);
        custY += 3;
      }
    });

    // Dispatch details on right
    doc.text('Dispatched through', rightX, yPosition + 8);
    doc.text('Destination', rightX, yPosition + 11);
    doc.text('Terms of Delivery', rightX, yPosition + 14);

    yPosition += 23;

    // Items Table Header - Updated column structure
    const tableHeaders = [
      'S.No.',
      'Name',
      'Code',
      'Quantity',
      'Price',
      'Amount'
    ];

    // Calculate column widths - adjusted for new structure
    const colWidths = [15, 60, 25, 20, 25, 30];
    let currentX = margin;

    // Draw table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.rect(margin, yPosition, contentWidth, 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    tableHeaders.forEach((header, index) => {
      doc.text(header, currentX + 2, yPosition + 5);
      if (index < colWidths.length - 1) {
        doc.line(currentX + colWidths[index], yPosition, currentX + colWidths[index], yPosition + 8);
      }
      currentX += colWidths[index];
    });

    yPosition += 8;

    // Items Table Body - Display actual products
    doc.setFont('helvetica', 'normal');
    let itemTotal = 0;
    let totalDiscount = 0;

    // Ensure we have items to display
    if (bill.items && bill.items.length > 0) {
      bill.items.forEach((item, index) => {
        const rowHeight = 12;
        currentX = margin;

        // Draw row border
        doc.rect(margin, yPosition, contentWidth, rowHeight);

        // S.No.
        doc.text((index + 1).toString(), currentX + 2, yPosition + 7);
        currentX += colWidths[0];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Name (Product Name)
        const productName = safeText(item.product.name);
        // Handle long product names by truncating if necessary
        const maxNameLength = 25;
        const displayName = productName.length > maxNameLength 
          ? productName.substring(0, maxNameLength) + '...' 
          : productName;
        doc.text(displayName, currentX + 2, yPosition + 7);
        currentX += colWidths[1];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Code (Product Code)
        const productCode = safeText(item.product.code);
        doc.text(productCode, currentX + 2, yPosition + 7);
        currentX += colWidths[2];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Quantity
        doc.text(safeNumber(item.quantity).toString(), currentX + 2, yPosition + 7);
        currentX += colWidths[3];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Price (Unit Price)
        doc.text(formatCurrency(safeNumber(item.unitPrice)), currentX + 2, yPosition + 7);
        currentX += colWidths[4];
        doc.line(currentX, yPosition, currentX, yPosition + rowHeight);

        // Amount (Quantity * Price = Subtotal)
        const amount = safeNumber(item.quantity) * safeNumber(item.unitPrice);
        doc.text(formatCurrency(amount), currentX + 2, yPosition + 7);
        itemTotal += amount;
        totalDiscount += safeNumber(item.discountAmount);

        yPosition += rowHeight;
      });
    }

    // Add empty rows if needed to maintain table structure
    const minRows = 8;
    const currentRows = bill.items ? bill.items.length : 0;
    if (currentRows < minRows) {
      for (let i = currentRows; i < minRows; i++) {
        const rowHeight = 12;
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
    if (totalDiscount > 0 || (bill.billDiscountAmount && bill.billDiscountAmount > 0)) {
      const rowHeight = 8;
      doc.rect(margin, yPosition, contentWidth, rowHeight);
      
      doc.setFont('helvetica', 'italic');
      doc.text('Less: Discount', margin + colWidths[0] + 2, yPosition + 5);
      
      const discountPercent = bill.billDiscountType === 'percentage' ? `(${bill.billDiscountValue}%)` : '';
      doc.text(discountPercent, pageWidth - margin - 50, yPosition + 5);
      
      const totalDiscountAmount = totalDiscount + (bill.billDiscountAmount || 0);
      doc.text(`(${formatCurrency(totalDiscountAmount)})`, pageWidth - margin - 25, yPosition + 5, { align: 'right' });
      
      yPosition += rowHeight;
    }

    // Total row
    const totalRowHeight = 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, contentWidth, totalRowHeight, 'F');
    doc.rect(margin, yPosition, contentWidth, totalRowHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total', pageWidth - margin - 80, yPosition + 6);
    doc.text(formatINR(safeNumber(bill.total)), pageWidth - margin - 5, yPosition + 6, { align: 'right' });

    yPosition += totalRowHeight + 5;

    // Amount in words
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Amount Chargeable (in words):', margin, yPosition);
    doc.text('E. & O.E', pageWidth - margin - 20, yPosition);
    yPosition += 4;

    // Convert number to words (simplified)
    const amountInWords = `INR ${numberToWords(Math.floor(safeNumber(bill.total)))} Only`;
    doc.setFont('helvetica', 'bold');
    doc.text(amountInWords, margin, yPosition);
    yPosition += 8;

    // Initialize actual tax amount
    let actualTaxAmount = 0;

    // Tax breakdown table
    if (bill.items && bill.items.length > 0) {
      const taxTableY = yPosition;
      
      // Tax table headers
      const taxHeaders = ['HSN/SAC', 'Taxable Value', 'IGST', 'Total Tax Amount'];
      const taxColWidths = [30, 40, 40, 40];
      
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
      const taxRowHeight = 6;
      
      doc.rect(margin, taxRowY, 150, taxRowHeight);
      doc.setFont('helvetica', 'normal');
      
      const taxableAmount = safeNumber(bill.subtotal) - safeNumber(bill.totalDiscount);
      const igstRate = 18; // Default GST rate
      const igstAmount = (taxableAmount * igstRate) / 100;
      
      // Update actual tax amount
      actualTaxAmount = igstAmount;
      
      taxX = margin;
      const taxData = ['', formatCurrency(taxableAmount), `${igstRate}% ${formatCurrency(igstAmount)}`, formatCurrency(igstAmount)];
      
      taxData.forEach((data, index) => {
        doc.text(data, taxX + 1, taxRowY + 4);
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
      doc.text('Total', margin + 1, totalTaxY + 4);
      doc.text(formatCurrency(taxableAmount), margin + taxColWidths[0] + taxColWidths[1] - 20, totalTaxY + 4, { align: 'right' });
      doc.text(formatCurrency(igstAmount), margin + taxColWidths[0] + taxColWidths[1] + taxColWidths[2] - 20, totalTaxY + 4, { align: 'right' });
      doc.text(formatCurrency(igstAmount), margin + 150 - 5, totalTaxY + 4, { align: 'right' });

      yPosition = totalTaxY + taxRowHeight + 10;
    }

    // Tax amount in words - now dynamically calculated
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Tax Amount (in words):', margin, yPosition);
    yPosition += 4;
    
    const taxAmountInWords = actualTaxAmount > 0 
      ? `INR ${numberToWords(Math.floor(actualTaxAmount))} Only`
      : 'INR Zero Only';
    doc.setFont('helvetica', 'bold');
    doc.text(taxAmountInWords, margin, yPosition);
    yPosition += 10;

    // Company bank details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Company\'s Bank Details', margin, yPosition);
    yPosition += 4;
    
    const bankDetails = [
      `A/c Holder's Name: ${safeText(businessInfo.businessName)}`,
      `Bank Name: ${safeText(businessInfo.bankName) || 'Bank Name'}`,
      `A/c No.: ${safeText(businessInfo.accountNumber) || 'Account Number'}`,
      `Branch & IFS Code: ${safeText(businessInfo.swiftCode) || 'IFSC Code'}`
    ];

    bankDetails.forEach(detail => {
      doc.text(detail, margin, yPosition);
      yPosition += 3;
    });

    // Authorization signature
    doc.text('for ' + safeText(businessInfo.businessName).toUpperCase(), pageWidth - margin - 60, yPosition - 10);
    yPosition += 10;
    doc.text('Authorised Signatory', pageWidth - margin - 60, yPosition);

    // Footer
    yPosition = pageHeight - 20;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('This is a Computer Generated Invoice', pageWidth / 2, yPosition, { align: 'center' });

    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

// Helper function to convert numbers to words (simplified version)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

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
  let place = 0;
  
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
    const doc = generateA5BillPDF(bill, businessInfo);
    const fileName = `Invoice_${bill.billNumber || 'bill'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    doc.save(fileName);
    console.log(`PDF downloaded: ${fileName}`);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF. Please check your browser settings and try again.');
  }
};

export const printBillPDF = async (bill: Bill, businessInfo: User): Promise<void> => {
  try {
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
    } else {
      URL.revokeObjectURL(blobUrl);
      await downloadBillPDF(bill, businessInfo);
      throw new Error('Print popup was blocked. PDF has been downloaded instead.');
    }
  } catch (error) {
    console.error('Error printing PDF:', error);
    throw new Error('Failed to print PDF. Please try downloading instead.');
  }
};

export const generateAndDownloadPDF = async (bill: Bill, businessInfo: User, action: 'download' | 'print' = 'download'): Promise<void> => {
  try {
    if (action === 'print') {
      await printBillPDF(bill, businessInfo);
    } else {
      await downloadBillPDF(bill, businessInfo);
    }
  } catch (error) {
    console.error(`Error ${action}ing PDF:`, error);
    if (action === 'print') {
      try {
        await downloadBillPDF(bill, businessInfo);
        throw new Error('Print failed. PDF has been downloaded instead.');
      } catch (downloadError) {
        throw new Error('Both print and download failed. Please try again.');
      }
    } else {
      throw error;
    }
  }
};
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEnhancedBilling } from '../context/EnhancedBillingContext';
import { useEnhancedAuth } from '../context/EnhancedAuthContext';
import { Search, FileText, Printer, Trash2, Eye, Download, Filter } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/calculations';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

const BillHistory: React.FC = () => {
  const { bills, deleteBill } = useEnhancedBilling();
  const { user } = useEnhancedAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  
  const filteredBills = bills.filter((bill) => {
    const matchesSearch = 
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customer.phone.includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || bill.paymentStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await deleteBill(id);
      } catch (error) {
        console.error('Error deleting bill:', error);
      }
    }
  };
  
  const handleDownloadPDF = async (billId: string) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill || !user) {
      toast.error('Bill or user information not available');
      return;
    }
    
    try {
      setIsGeneratingPDF(billId);
      await generateAndDownloadPDF(bill, user, 'download');
      toast.success('Bill downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF');
    } finally {
      setIsGeneratingPDF(null);
    }
  };
  
  const handlePrintPDF = async (billId: string) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill || !user) {
      toast.error('Bill or user information not available');
      return;
    }
    
    try {
      setIsGeneratingPDF(billId);
      await generateAndDownloadPDF(bill, user, 'print');
      toast.success('Print dialog opened');
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to print PDF');
    } finally {
      setIsGeneratingPDF(null);
    }
  };
  
  const sortedBills = [...filteredBills].sort((a, b) => b.createdAt - a.createdAt);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Paid</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>;
      case 'overdue':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Overdue</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill History</h1>
          <p className="text-sm text-gray-500">View and manage all your bills from your secure database</p>
        </div>
        
        <Link
          to="/new-bill"
          className="btn btn-primary flex items-center space-x-2"
        >
          <FileText size={18} />
          <span>Create New Bill</span>
        </Link>
      </div>
      
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="input pl-10"
                placeholder="Search bills by number, customer name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="input w-auto"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>
        
        {sortedBills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedBills.map((bill) => (
                  <tr key={bill.id} className="table-row">
                    <td className="font-medium text-gray-900">
                      {bill.billNumber}
                    </td>
                    <td className="text-sm text-gray-500">
                      {formatDateTime(bill.createdAt)}
                    </td>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">
                          {bill.customer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {bill.customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-gray-500">
                      {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td>
                      {getStatusBadge(bill.paymentStatus)}
                    </td>
                    <td className="font-medium text-gray-900">
                      {formatCurrency(bill.total)}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <Link
                          to={`/view-bill/${bill.id}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Bill"
                        >
                          <Eye size={18} />
                        </Link>
                        <button
                          onClick={() => handlePrintPDF(bill.id)}
                          disabled={isGeneratingPDF === bill.id}
                          className="text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                          title="Print Bill"
                        >
                          {isGeneratingPDF === bill.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <Printer size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(bill.id)}
                          disabled={isGeneratingPDF === bill.id}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {isGeneratingPDF === bill.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                          ) : (
                            <Download size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Bill"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'No bills match your search criteria'
              : 'No bills available'}
            {!searchTerm && filterStatus === 'all' && (
              <div className="mt-4">
                <Link
                  to="/new-bill"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Create your first bill →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Summary Stats */}
      {bills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-blue-600">Total Bills</div>
            <div className="text-2xl font-bold text-blue-900">{bills.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm font-medium text-green-600">Total Revenue</div>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(bills.reduce((sum, bill) => sum + bill.total, 0))}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-sm font-medium text-yellow-600">Average Bill</div>
            <div className="text-2xl font-bold text-yellow-900">
              {formatCurrency(bills.reduce((sum, bill) => sum + bill.total, 0) / bills.length)}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm font-medium text-purple-600">Items Sold</div>
            <div className="text-2xl font-bold text-purple-900">
              {bills.reduce((sum, bill) => sum + bill.items.reduce((s, item) => s + item.quantity, 0), 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillHistory;
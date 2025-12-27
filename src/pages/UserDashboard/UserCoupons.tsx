import React, { useState } from 'react';
import { Tag, Check, X } from 'lucide-react';
import Button from '../../components/Button';
import { couponsService } from '../../services/coupons';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import type { ValidateCouponResponse } from '../../types';

const UserCoupons: React.FC = () => {
    const dispatch = useDispatch();
    const [validateCode, setValidateCode] = useState('');
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidateCouponResponse | null>(null);
    const [validationError, setValidationError] = useState<string>('');

    const handleValidate = async () => {
        if (!validateCode.trim()) {
            dispatch(showToast({ message: 'Please enter a coupon code', type: 'error' }));
            return;
        }

        try {
            setValidating(true);
            setValidationError('');
            setValidationResult(null);

            // Validate coupon without specific amount (just check if code exists and is active)
            const response = await couponsService.validate({
                couponCode: validateCode.toUpperCase(),
                amount: 0, // Pass 0 to just validate existence
                itemType: 'Plan',
                itemId: '', // Empty for general validation
            });

            const couponData = (response as any)?.data || response;

            if (couponData && couponData.isValid) {
                setValidationResult(couponData);
                setValidationError('');
                dispatch(showToast({
                    message: `Coupon "${validateCode.toUpperCase()}" is valid!`,
                    type: 'success'
                }));
            } else {
                setValidationResult(null);
                const errorMsg = couponData?.message || 'Invalid or expired coupon code';
                setValidationError(errorMsg);
                dispatch(showToast({ message: errorMsg, type: 'error' }));
            }
        } catch (error: any) {
            console.error('Validation error:', error);
            setValidationResult(null);
            const errorMsg = error.response?.data?.message ||
                error.response?.data?.messages?.[0] ||
                error.message ||
                'Invalid or expired coupon';
            setValidationError(errorMsg);
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        } finally {
            setValidating(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-8">

            {/* Info Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                    <Tag size={32} className="text-pink-500 flex-shrink-0" />
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">How to Use Coupons</h3>
                        <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                            <li>• Enter your coupon code in the field above to validate it</li>
                            <li>• Apply valid coupons during checkout to get discounts on quizzes and plans</li>
                            <li>• Each coupon has specific terms and conditions</li>
                            <li>• Contact support if you have any questions about coupons</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserCoupons;

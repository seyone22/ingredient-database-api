"use client";

import React, { useMemo } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styles from "./Pagination.module.css";

// Helper function to generate page numbers
const DOTS = "...";
const range = (start: number, end: number) => {
    let length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
};

interface UsePaginationOptions {
    totalPageCount: number;
    currentPage: number;
    siblingCount?: number;
}

const usePagination = ({
                           totalPageCount,
                           currentPage,
                           siblingCount = 1,
                       }: UsePaginationOptions) => {
    const paginationRange = useMemo(() => {
        const totalPageNumbers = siblingCount * 2 + 5;

        if (totalPageNumbers >= totalPageCount) {
            return range(1, totalPageCount);
        }

        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);

        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < totalPageCount - 1;

        const firstPageIndex = 1;
        const lastPageIndex = totalPageCount;

        if (!shouldShowLeftDots && shouldShowRightDots) {
            let leftItemCount = 3 + 2 * siblingCount;
            let leftRange = range(1, leftItemCount);
            return [...leftRange, DOTS, totalPageCount];
        }

        if (shouldShowLeftDots && !shouldShowRightDots) {
            let rightItemCount = 3 + 2 * siblingCount;
            let rightRange = range(totalPageCount - rightItemCount + 1, totalPageCount);
            return [firstPageIndex, DOTS, ...rightRange];
        }

        if (shouldShowLeftDots && shouldShowRightDots) {
            let middleRange = range(leftSiblingIndex, rightSiblingIndex);
            return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
        }

        return range(1, totalPageCount);
    }, [totalPageCount, currentPage, siblingCount]);

    return paginationRange;
};

interface PaginationProps {
    currentPage: number;
    totalPageCount: number;
    onPageChange: (page: number) => void;
    siblingCount?: number;
    disabled?: boolean;
}

export default function Pagination({
                                       currentPage,
                                       totalPageCount,
                                       onPageChange,
                                       siblingCount = 1,
                                       disabled = false,
                                   }: PaginationProps) {
    const paginationRange = usePagination({ totalPageCount, currentPage, siblingCount });

    if (totalPageCount <= 1 || paginationRange.length === 0) return null;

    const onNext = () => {
        if (!disabled && currentPage < totalPageCount) onPageChange(currentPage + 1);
    };

    const onPrevious = () => {
        if (!disabled && currentPage > 1) onPageChange(currentPage - 1);
    };

    return (
        <div className={styles.pagination}>
            <button
                className={styles.paginationButton}
                onClick={onPrevious}
                disabled={disabled || currentPage <= 1}
                aria-label="Previous page"
            >
                <FaChevronLeft size={16} style={{ marginRight: 4 }} />
            </button>

            <div className={styles.pageNumbers}>
                {paginationRange.map((pageNumber, index) => {
                    if (pageNumber === DOTS) return <span key={index} className={styles.dots}>&#8230;</span>;

                    const pageNum = Number(pageNumber);
                    return (
                        <button
                            key={index}
                            className={`${styles.pageNumberButton} ${pageNum === currentPage ? styles.activePage : ''}`}
                            onClick={() => onPageChange(pageNum)}
                            disabled={disabled}
                            aria-current={pageNum === currentPage ? 'page' : undefined}
                        >
                            {pageNumber}
                        </button>
                    );
                })}
            </div>

            <button
                className={styles.paginationButton}
                onClick={onNext}
                disabled={disabled || currentPage >= totalPageCount}
                aria-label="Next page"
            >
                <FaChevronRight size={16} style={{ padding: 0, margin: 0 }} />
            </button>
        </div>
    );
}

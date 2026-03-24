"use client";

import React, { useMemo } from "react";
import {
    Pagination as PaginationContainer,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

// --- Custom Hook Logic ---
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
    return useMemo(() => {
        // Total items to show: sibling(s) + first + last + current + 2*dots
        const totalPageNumbers = siblingCount * 2 + 5;

        // If we have fewer pages than the max display limit, show all pages
        if (totalPageNumbers >= totalPageCount) {
            return range(1, totalPageCount);
        }

        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);

        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

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
};

// --- Component ---
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

    // Hide pagination if there is only 1 page
    if (currentPage === 0 || paginationRange.length < 2) {
        return null;
    }

    const handlePrevious = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!disabled && currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!disabled && currentPage < totalPageCount) onPageChange(currentPage + 1);
    };

    return (
        <PaginationContainer className={disabled ? "opacity-50 pointer-events-none" : ""}>
            <PaginationContent>
                {/* Previous Button */}
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={handlePrevious}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        aria-disabled={currentPage <= 1 || disabled}
                    />
                </PaginationItem>

                {/* Page Numbers & Ellipses */}
                {paginationRange.map((pageNumber, index) => {
                    if (pageNumber === DOTS) {
                        return (
                            <PaginationItem key={`dots-${index}`}>
                                <PaginationEllipsis />
                            </PaginationItem>
                        );
                    }

                    const pageNum = Number(pageNumber);

                    return (
                        <PaginationItem key={index}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (!disabled) onPageChange(pageNum);
                                }}
                                isActive={pageNum === currentPage}
                                className="cursor-pointer"
                            >
                                {pageNum}
                            </PaginationLink>
                        </PaginationItem>
                    );
                })}

                {/* Next Button */}
                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={handleNext}
                        className={currentPage >= totalPageCount ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        aria-disabled={currentPage >= totalPageCount || disabled}
                    />
                </PaginationItem>
            </PaginationContent>
        </PaginationContainer>
    );
}
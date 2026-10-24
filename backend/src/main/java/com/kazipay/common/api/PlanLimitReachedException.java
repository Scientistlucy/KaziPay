package com.kazipay.common.api;

public class PlanLimitReachedException extends RuntimeException {
    public PlanLimitReachedException(String message) { super(message); }
}

USER_FACING_CAUTIONS = (
    "입력한 공고와 경험을 기준으로 한 참고 자료이며 합격을 보장하지 않습니다.",
    "최종 지원 전 최신 공고와 본인의 실제 수행 경험으로 다시 확인하세요.",
    "포트폴리오/README에는 실행 근거를 남기고, API Key·비밀번호 같은 민감정보는 노출하지 마세요.",
)


def user_facing_cautions() -> list[str]:
    return list(USER_FACING_CAUTIONS)
